async function main() {
  let app = new Vue({
    el: '#app',

    data: {
      volumeShort: 'bofm',
      bookShort: '1-ne',
      bookLong: '1 Nephi',
      chapter: '1',
      input: '',
      inputErrorChapter: false,
      inputErrorChapterInfo: '',
      inputErrorBook: false,
      inputErrorBookInfo: '',
      placeholder: '1 Nephi 1',
      newLang: '',
      removeLang: '',
      chapts: [],
      unorderedChapters: [],
      langsInfo: [],
      selected: "selected",
      rightAlignLangs:[
        'ara',
        'pes',
        'urd'
      ],
      noContentLangs: [
        'apw',
        'hmo',
        'cag',
        'ept',
        'ben',
        'kan'
      ],
      booksInfo: booksInfo,
      userLang: navigator.language || navigator.userLanguage
    },
    created: async function() {
      this.volumeShort = getStorage('volumeShort') || setStorage('volumeShort', 'bofm');
      this.bookShort = getStorage('bookShort') || setStorage('bookShort', '1-ne');
      this.bookLong = getStorage('bookLong') || setStorage('bookLong', '1 Nephi');
      this.chapter = getStorage('chapter') || setStorage('chapter', '1');

      let chapters = getStorage('chapters', 'JSON');
      if (!chapters || chapters.length == 0) {
        let chapters = [await getChapter('eng', this.volumeShort, this.bookShort, this.chapter)];
        this.chapts = setStorage('chapters', chapters, 'JSON');
      } else {
        this.chapts = chapters;
      }

      this.placeholder = `${this.bookLong} ${this.chapter}`;

      this.langsInfo = await getLangs();

      autocomplete(document.getElementById('chapter-input'), this.booksInfo.map(i => i[0]), this.booksInfo.map(i => `(1..${i[2]})`))
    },
    methods: {
      handleInput: async function() {
        let input = this.input.match(/\S+/g);

        if (parseInt(input.slice(-1)[0])) {
          var book = input.slice(0, -1).join(' ');
          var chapter = input.slice(-1)[0];
        } else {
          var book = input.join(' ');
          var chapter = '1';
        }

        let bookInfo = getBookInfo(book);

        if (bookInfo) {
          this.inputErrorBook = false;
          this.inputErrorBookInfo = bookInfo[0];
          if (parseInt(chapter) > 0 && parseInt(bookInfo[2]) >= parseInt(chapter)) {

            this.volumeShort = setStorage('volumeShort', bookInfo[3]);
            this.bookShort = setStorage('bookShort', bookInfo[1]);
            this.bookLong = setStorage('bookLong', bookInfo[0]);
            this.chapter = setStorage('chapter', chapter);

            this.placeholder = `${this.bookLong} ${this.chapter}`;

            this.input = '';
            this.inputErrorChapter = false;

            tempChapts = [];

            for (i in this.chapts) {
              tempChapts.splice(i, 1, getChapter(this.chapts[i].lang, this.volumeShort, this.bookShort, this.chapter));
            }
            for (i in tempChapts) {
              this.chapts.splice(i, 1, await tempChapts[i]);
            }
            setStorage('chapters', this.chapts, 'JSON');
            window.scroll(0,0);

          } else {
            this.inputErrorChapterInfo = bookInfo[2];
            this.inputErrorChapter = true;
            this.input = '';
          }
        } else {
          this.inputErrorBook = true;
          this.inputErrorBookInfo = book;
          this.input = '';
        }
      },
      nextChapter: function() {
        let bookInfo = getBookInfo(this.bookLong);
        if (parseInt(this.chapter) + 1 <= parseInt(bookInfo[2])) {
          this.input = this.bookLong + ' ' + (parseInt(this.chapter)+1).toString();
        } else {
          bookInfo = this.booksInfo[(this.booksInfo.indexOf(bookInfo)+1)%this.booksInfo.length];
          this.input = bookInfo[0] + ' ' + '1';
        }
        this.handleInput();
      },
      previousChapter: function() {
        let bookInfo = getBookInfo(this.bookLong);
        if (parseInt(this.chapter) - 1 > 0) {
          this.input = this.bookLong + ' ' + (parseInt(this.chapter)-1).toString();
        } else {
          let index = this.booksInfo.indexOf(bookInfo) - 1;
          if (index >= 0) {
            bookInfo = this.booksInfo[index];
            this.input = bookInfo[0] + ' ' + bookInfo[2];
          } else {
            bookInfo = this.booksInfo.slice(-1);
            this.input = bookInfo[0] + ' ' + bookInfo[2];
          }
        }console.log(document.getElementsByTagName('datalist')[0])
        this.handleInput();
      },
      addLang: function() {
        if (this.newLang) {
          getChapter(this.newLang, this.volumeShort, this.bookShort, this.chapter).then(
            data => {
              this.chapts.push(data);
              setStorage('chapters', this.chapts, 'JSON');
            }
          )
        }
        this.newLang = '';
      },
      delLang: function() {
        let index = this.chapts.indexOf(this.chapts.find(element => element.lang == this.removeLang));
        this.chapts.splice(index, 1);
        setStorage('chapters', this.chapts, 'JSON');
      },
      textAlign: function(lang) {
        if (this.rightAlignLangs.includes(lang)) {
          return 'right';
        }
        return 'left';
      }
    },
    computed: {
      chapters: function() {
        return this.chapts;
      },
      fillLength: function() {
        let length = 0;
        for (let language of this.chapts) {
          if (language.divLength>length) {
            length = language.divLength
          }
        }
        return length
      }
    }
  })
  // Courtesy of https://www.w3schools.com/howto/howto_js_autocomplete.asp
  // But slightly modified for my uses
  function autocomplete(inp, arr, labelarr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) { return false;}
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
          /*check if the item starts with the same letters as the text field value:*/
          if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            /*make the matching letters bold:*/
            b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
            b.innerHTML += arr[i].substr(val.length);
            b.innerHTML += `<i class="chapter-range">${labelarr[i]}<i>`
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function(e) {
                /*insert the value for the autocomplete text field:*/
                inp.value = this.getElementsByTagName("input")[0].value;
                app.input = inp.value
                /*close the list of autocompleted values,
                (or any other open lists of autocompleted values:*/
                closeAllLists();
            });
            a.appendChild(b);
          }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
          /*If the arrow DOWN key is pressed,
          increase the currentFocus variable:*/
          currentFocus++;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 38) { //up
          /*If the arrow UP key is pressed,
          decrease the currentFocus variable:*/
          currentFocus--;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode ==  13 || e.keyCode == 39) {
          /*If the ENTER key is pressed, prevent the form from being submitted,*/
          e.preventDefault();
          if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (x) x[currentFocus].click();
          }
        }
    });
    function addActive(x) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }
    function closeAllLists(elmnt) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      var x = document.getElementsByClassName("autocomplete-items");
      for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
  }

  async function getHtml(url) {
    let response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
    if (response.ok) {
      let parser = new DOMParser();
      let html = await response.json();
      return parser.parseFromString(html.contents, 'text/html');
    }
  }
  var htmll = '';

  async function getChapter(lang, volume, book, chapter) {
    let url = `https://churchofjesuschrist.org/study/scriptures/${volume}/${book}/${chapter}?lang=${lang}`

    let html = await getHtml(url);
    console.log(html)
    htmll=html;

    //let node = document.createElement('iframe');
    //console.log(node)
    //node.setAttribute('class', 'scrape-tmp');
    //console.log(node)
    //console.log('before fail?')
    //node.append(html);
    //console.log('after faile?')
    //console.log(node)
    //document.getElementById('scrape-container').appendChild(node);
    //html = node;

    function getElementText(id, type) {
      if (html.getElementById(id)) {
        return parseVerse(html.getElementById(id), type);
      }
      return undefined
    }

    function parseVerse(raw, type) {
      let verse = '';
      let children = raw.childNodes;
      for (let child of children) {
        if (child.tagName == 'A') {
          if (typeof(type) == 'boolean') {
            verse += child.textContent;
          } else {
            //rawReferences = html.querySelectorAll(`#${child.getAttribute('href').slice(2)+'_p1'}`);
            //console.log(rawReferences[0].textContent);
            verse += child.textContent.slice(1)
          }
        } else if (child.tagName == 'RUBY') {
          verse += `<ruby><rb>${child.children[0].textContent}</rb><rt>${child.children[1].textContent}</rt></ruby>`;
        } else if (child.tagName == 'SPAN' && child.className == 'dominant') {
          verse += child.innerHTML;
        }
        else if (child.textContent) {
          verse += child.textContent;
        } else {
          verse += child.textContent;
        }
      }
      return verse;
    }

    let bookTitle = getElementText('title1', true);
    let bookSubtitle = getElementText('subtitle1', true)
    let bookSummary = getElementText('intro1', true);
    let chapterComprising = getElementText('study_intro1', true);
    let chapterTitle = getElementText('title_number1', true);
    let chapterSummary = getElementText('study_summary1', true);
    let verses = Array.from(html.getElementsByClassName('verse')).map(parseVerse);

    return {
      'lang': lang,
      'bookTitle': bookTitle,
      'bookSubtitle': bookSubtitle,
      'bookSummary': bookSummary,
      'chapterComprising': chapterComprising,
      'chapterTitle': chapterTitle,
      'chapterSummary': chapterSummary,
      'verses': verses,
      'divLength': verses.length + 7
    }
  }

  async function getLangs() {
    let url = 'https://www.churchofjesuschrist.org/languages?lang=eng';
    let studyUrl = 'https://www.churchofjesuschrist.org/study/scriptures?lang='
    let html = await getHtml(url);
    let langInfo = {}

    let rawLangs = Array.from(html.getElementsByClassName('language-list')[0].getElementsByTagName('a'));

    for (const a of rawLangs) {
      langInfo[a.getAttribute('data-lang')] = a.textContent;
    }
    return langInfo;
  }

  let getBookInfo = (input) => {return this.booksInfo.find(book => book[0].toLowerCase() == input.toLowerCase() || book[1].toLowerCase() == input.toLowerCase())};

  function setStorage(name, value, type) {
    let setVal = value;
    if (type == 'JSON') {
      setVal = JSON.stringify(value);
    }
    localStorage.setItem(name, setVal);
    return value;
  }

  function getStorage(name, type) {
    let value = localStorage.getItem(name);
    if (type == 'JSON' && value) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return value;
      }
    }
    return value;
  }
}

main()
