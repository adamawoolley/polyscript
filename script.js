async function getHtml(url) {
  let response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
  if (response.ok) {
    let parser = new DOMParser();
    let html = await response.json();
    return parser.parseFromString(html.contents, 'text/html');
  }
}

async function getChapter(lang, volume, book, chapter) {
  let url = `https://churchofjesuschrist.org/study/scriptures/${volume}/${book}/${chapter}?lang=${lang}`

  let html = await getHtml(url);

  function getElementText(id) {
    if (html.getElementById(id)) {
      return parseVerse(html.getElementById(id));
    }
    return undefined
  }

  function parseVerse(raw) {
    let verse = '';
    let children = raw.childNodes;
    for (const child of children) {
      if (child.tagName == 'A') {
        verse += child.textContent.slice(1);
      } else if (child.tagName == 'RUBY') {
        verse += child.children[1].textContent;
      } else if (child.textContent) {
        verse += child.textContent;
      }
    }
    return verse;
  }

  let bookTitle = getElementText('title1');
  let bookSubtitle = getElementText('subtitle1')
  let bookSummary = getElementText('intro1');
  let chapterComprising = getElementText('study-intro1');
  let chapterTitle = getElementText('title_number1');
  let chapterSummary = getElementText('study_summary1');
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
  let html = await getHtml(url);
  let langInfo = {}

  let rawLangs = Array.from(html.getElementsByClassName('language-list')[0].getElementsByTagName('a'));

  for (const a of rawLangs) {
    langInfo[a.getAttribute('data-lang')] = a.textContent;
  }

  return langInfo;
}

String.prototype.toTitleCase = function() {
  return this.toLowerCase().split(' ').map(function(word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
}

let getBookInfo = (input) => { return booksInfo.find(book => book[0] == input.toTitleCase() || book[1] == input.toLowerCase())};

// Cookie functions courtesy of https://www.w3schools.com/js/js_cookies.asp

function setCookie(cname, cvalue, ctype, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = 'expires='+ d.toUTCString();
  if (ctype == 'JSON') {
    if (!cvalue.length) {
      cvalue = '';
    } else {
      cvalue = JSON.stringify(cvalue);
    }
  }
  document.cookie = `${cname}=${cvalue};SameSite=Lax;${expires};path=/`;
  return cvalue
}

function getCookie(cname, ctype) {
  var name = cname + '=';
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      if (ctype == 'JSON') {
        try {
          return JSON.parse(c.substring(name.length, c.length));
        } catch (err) {
          return ''
        }
      } else {
        return c.substring(name.length, c.length);
      }
    }
  }
  return '';
}

async function main() {
  Vue.use(AsyncComputed, {
    default: 'Global default value'
  })

  let app = new Vue({
    el: '#app',

    data: {
      volumeShort: '',
      bookShort: '',
      bookLong: '',
      chapter: '',
      input: '',
      inputErrorChapter: false,
      inputErrorChapterInfo: '',
      inputErrorBook: false,
      inputErrorBookInfo: '',
      placeholder: '',
      newLang: '',
      removeLang: '',
      langs: [],
      langsInfo: [],
      selected: "selected",
    },
    created: async function() {
      this.volumeShort = getCookie('volumeShort') || setCookie('volumeShort', 'bofm');
      this.bookShort = getCookie('bookShort') || setCookie('bookShort', '1-ne');
      this.bookLong = getCookie('bookLong') || setCookie('bookLong', '1 Nephi');
      this.chapter = getCookie('chapter') || setCookie('chapter', '1');

      this.langs = getCookie('langs', 'JSON') || setCookie('langs', ['eng'], 'JSON');

      this.placeholder = `${this.bookLong} ${this.chapter}`;

      this.langsInfo = await getLangs();
    },
    methods: {
      handleInput: function() {
        let input = this.input.match(/\S+/g);

        if (parseInt(input.slice(-1)[0])) {
          var book = input.slice(0, -1).join(' ');
          var chapter = input.slice(-1)[0];
        } else {
          var book = input.join(' ');
          var chapter = '1';
        }

        let bookInfo = getBookInfo(book);

        this.inputErrorChapterInfo = chapter;

        if (bookInfo) {
          this.inputErrorBook = false;
          this.inputErrorBookInfo = bookInfo[0];
          if (parseInt(chapter) > 0 && parseInt(bookInfo[2]) >= parseInt(chapter)) {

            this.volumeShort = setCookie('volumeShort', bookInfo[3]);
            this.bookShort = setCookie('bookShort', bookInfo[1]);
            this.bookLong = setCookie('bookLong', bookInfo[0]);
            this.chapter = setCookie('chapter', chapter);

            this.placeholder = `${this.bookLong} ${this.chapter}`;

            this.input = '';
            this.inputErrorChapter = false;
          } else {
            this.inputErrorChapter = true;
            this.input = '';
          }
        } else {
          this.inputErrorBook = true;
          this.inputErrorBookInfo = book;
          this.input = '';
        }
      },
      addLang: function() {
        this.langs.push(this.newLang);
        setCookie('langs', this.langs, 'JSON');
      },
      delLang: function() {
        console.log(this.langs);
        console.log(this.removeLang)
        this.langs.splice(this.langs.indexOf(this.removeLang),1)
        setCookie('langs', this.langs, 'JSON')
      }
    },
    asyncComputed: {
      chapters: {
        async get() {
        let chapter_list = [];

        for (const lang of this.langs) {
          chapter = await getChapter(lang, this.volumeShort, this.bookShort, this.chapter)//.then(data => chapter_list.push(data));
          chapter_list.push(chapter);
        }

        return chapter_list;
      },
      default: []
      //default: []
    }
        //default() {
        //  return [1,2,3]
        //}
    //default: new Array
    }
  })
}

main()
//get() {
//  let chapter_list = [];
//
//  for (const lang of this.langs) {
//    getChapter(lang, this.volumeShort, this.bookShort, this.chapter).then(data => chapter_list.push(data));
//  }
//  return chapter_list;
//}
