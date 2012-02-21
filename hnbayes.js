javascript:(function(e,a,g,h,f,c,b,d){if(!(f=e.jQuery)||g>f.fn.jquery||h(f)){c=a.createElement("script");c.type="text/javascript";c.src="http://ajax.googleapis.com/ajax/libs/jquery/"+g+"/jquery.min.js";c.onload=c.onreadystatechange=function(){if(!b&&(!(d=this.readyState)||d=="loaded"||d=="complete")){h((f=e.jQuery).noConflict(1),b=1);f(c).remove()}};a.documentElement.childNodes[0].appendChild(c)}})(window,document,"1.7.1",function($,L){
// My code

// Add mysteriously missing functions

Array.prototype.contains = function(element) {
  return this.some(function(cmpElement){
    return element === cmpElement;
  });  
}

Array.prototype.uniq = function(){
  return this.reduce(function(result, element){
    if(!result.contains(element)){
      result.push(element);
    }
    return result;
  }
  ,[]);
}

BayesFilter = function(useLocalStorage) {

  // Variables
  this.klasses = {};
  this.data = {};
  this.assumedProbability = 0.5;
  this.assumedProbabilityWeight = 1;
  this.documentCount = 0;
  this.useLocalStorage = !!useLocalStorage;

  // Local Storage
  
  this.loadFromLocalStorage = function(){
    var data = window.localStorage.getItem("BayesFilterData");
    if(data){
      savedData = JSON.parse(data);
      this.data = savedData.data;
      this.klasses = savedData.klasses;
      this.documentCount = savedData.documentCount;
    }
  }

  this.saveToLocalStorage = function(){
    var savedData = {data: this.data, klasses: this.klasses, documentCount: this.documentCount}
    var dataJSON = JSON.stringify(savedData);
    window.localStorage.setItem("BayesFilterData", dataJSON);
  }

  if(this.useLocalStorage){
    this.loadFromLocalStorage();
  }

  // Helpers
  // May not really be thought out too well...
  this.helpers = {};

  this.helpers.getWordSet = function(text) {
    var split = text.split(/\W/); // Split on everything that isn't a word character. TODO: Rethink for utf-8
    split = split.filter(function(word){return word != ""}); // Remove empty strings
    split = split.map(function(word){return word.toLowerCase()}); // Make everything lowercase
    split = split.uniq(); // Get only unique words
    return split;
  };

  this.helpers.addWordSet = function(oldData, words, klass) {
    // How do I clone objects?
    var newData = oldData;
    for(var i = 0; i < words.length; i++){
      word = words[i]; 
      if(newData[word]) {
        if(newData[word][klass]){
          newData[word][klass] += 1;
        } else {
          newData[word][klass] = 1;
        }
      } else {
        newData[word] = {};
        newData[word][klass] = 1;
      } 
    }
    return newData;
  }

  this.helpers.addKlass = function(oldKlasses, klass) {
    if(oldKlasses[klass]){
      oldKlasses[klass] += 1;
    } else {
      oldKlasses[klass] = 1;
    }
    return oldKlasses;
  }


  // Functions
  
  this.wordCount = function(word, klass) {
    word = word.toLowerCase();
    if(this.data[word] && this.data[word][klass]){
      return this.data[word][klass];
    } else {
      return 0;
    }
  }

  this.totalWordCount = function(word) {
    word = word.toLowerCase();
    var count = 0;
    if(this.data[word]){
      for(klass in this.data[word]){
        count += this.data[word][klass]; 
      }
    }
    return count;
  }
  
  this.wordProbability = function(word, klass) {
    word = word.toLowerCase();
    if(this.data[word] && this.data[word][klass]) { // Word must exist and class must exist
      var wordCount = this.data[word][klass];
      var klassCount = this.klasses[klass];
      return wordCount / klassCount;
    } else {
      return 0;
    }
  }

  this.weightedProbability = function(word, klass) {
    word = word.toLowerCase();
    var unweightedProbability = this.wordProbability(word, klass);
    var totalWordCount = this.totalWordCount(word);
    return ((this.assumedProbability * this.assumedProbabilityWeight) + (totalWordCount * unweightedProbability)) / (this.assumedProbabilityWeight + totalWordCount);
  }

  this.documentProbability = function(dokument, klass) {
    var probability = 1;
    var words = this.helpers.getWordSet(dokument);
    for(i = 0; i < words.length; i++){
      var word = words[i];
      probability = probability * this.weightedProbability(word, klass);
    }     
    return probability;
  }

  this.categoryProbability = function(dokument, klass) {
    var documentProbability = this.documentProbability(dokument, klass);
    var categoryProbability = this.klasses[klass] / this.documentCount; // think of new name
    return documentProbability * categoryProbability;
  }

  this.train = function(text, klass) {
    var words = this.helpers.getWordSet(text);
    this.data = this.helpers.addWordSet(this.data, words, klass);
    this.klasses = this.helpers.addKlass(this.klasses, klass);  
    this.documentCount += 1;

    if(this.useLocalStorage){
      this.saveToLocalStorage();
    }
    return this;
  };

};
  
filter = new BayesFilter(true) // Use local storage;

// Load views urls

var viewedUrls = {}

var maybeUrls = localStorage.getItem("viewedUrls");

if(maybeUrls){
  viewedUrls = JSON.parse(maybeUrls);
}

// Add like / dislike links

  var like = $(" <img class='training like' src='https://github.com/rogerbraun/HNBayes/raw/master/images/thumbs-up.png' />");
  var dislike = $(" <img class='training dislike' src='https://github.com/rogerbraun/HNBayes/raw/master/images/thumbs-down.png' />");
  var rate = $(" <img class='rate' src='https://github.com/rogerbraun/HNBayes/raw/master/images/eye.png' />");
  var rate_result = $("<span class='rate_result'></span>");

  var trainFromUrl = function(url, klass){
    var request = "http://viewtext.org/api/text?url=" + encodeURI(url) + "&callback=?";
    $.getJSON(request, function(response){
      filter.train(response.content, klass);
    });
    viewedUrls[url] = true;
    localStorage.setItem("viewedUrls", JSON.stringify(viewedUrls));
  }

// Some styles
  var style = document.createElement("style");
  style.type = "text/css";
  style.innerHTML = "\
    img.training, img.rate { \
      padding-left:5px; \
    }";
  document.body.appendChild(style);

  var rateFromUrl = function(url, target){
    var request = "http://viewtext.org/api/text?url=" + encodeURI(url) + "&callback=?";
    $.getJSON(request, function(response){
      var good = filter.categoryProbability(response.content, "good");
      var bad = filter.categoryProbability(response.content, "bad");
      if(good > bad) {
        target.innerHTML = " Probably good!";
      } else {
        target.innerHTML = " Probably bad!";
      }
    });
  }

  like.bind("click", function(event) {
    var target = $(event.target);
    var link = target.siblings("a")[0].href;
    target.siblings(".training").remove();
    target.remove();
    trainFromUrl(link, "good");
  });
  
  dislike.bind("click", function(event) {
    var target = $(event.target);
    var link = target.siblings("a")[0].href;
    target.siblings(".training").remove();
    target.remove();
    trainFromUrl(link, "bad");
  });

  rate.bind("click", function(){
    var target = $(event.target);
    var link = target.siblings("a")[0].href;
    var result_span = target.siblings(".rate_result")[0];
    rateFromUrl(link, result_span);
  });

  var stories = $(".title:nth-child(3) a");
  stories.after(rate_result);
  stories.after(rate);

  var newStories = stories.filter(function(i){
    return !(viewedUrls[this.href]);
  });
 
  newStories.after(dislike);
  newStories.after(like);
});
