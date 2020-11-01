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
        }
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
}

main()
