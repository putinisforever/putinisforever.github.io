/**
*@author Anton Shein
*@email anton@artgorbunov.ru
*/
// Смещение "листа с конституцией" от верха экрана
PAGE_OFFSET = null;
// Смещение для блока с закладками, обусловленное высотой блока с сылками на текст конституции
SOURCES_OFFSET = null;

// DOM объект элемента со сроллингом
SCROLLER = null;

// Кэш для блока с поиском, используется при вычислении его положения с учетом скроллинга
SEARCH_BLOCK = null;                 // Сам DOM объект блока с поиском
SEARCH_BLOCK_OFFSET = null;          // Его текущее смещение
DEFAULT_SEARCH_BLOCK_OFFSET = 7;    // Смещение в пикселях от верхней кромки экрана по умолчанию

// Кэш для блока с закладками, используется при вычислении его положения с учетом скроллинга
BOOKMARKS_BLOCK = null;              // Сам DOM объект блока с закладками
BOOKMARKS_BLOCK_OFFSET = null;       // Его текущее смещение
DEFAULT_BOOKMARKS_BLOCK_OFFSET = 30; // Смещение в пикселях от верхней кромки экрана по умолчанию

var CONSTITUTION_BODY_WRAP = null;   // Обёртка тела конституции

var scrollElement,
        scroll,
        save,
        today;

SEARC_FIELD = null;

IE_VERSION = false;
if (/MSIE/.test(navigator.userAgent))
{
	IE_VERSION = navigator.userAgent.match(/MSIE\s+(\d)/)[1];
}

PREVIOUS_SCROLL = null; // Предыдущая позиция главного скроллинга, нужна для вычисления смещения и перемещения блока с закладками, если их слишком много

function addEvent (dElement, sEventType, fHandler)
{
	if (dElement.attachEvent) dElement.attachEvent ('on' + sEventType, fHandler);
	if (dElement.addEventListener) dElement.addEventListener (sEventType, fHandler, false);
}

addEvent (window, 'load', init);

/*
 *   Для скролла стрелками
 */
var stat = false,
    down = false;

var _che;

var allowedKeyCodes = {
    '33' : 'PageUp',
    '34' : 'PageDown',
    '38' : 'UpArrow',
    '40' : 'DownArrow'
}

/**
 * Функция инициализации
 */
function init ()
{
	var sources = document.getElementById('sources');
	var tmp_arr=document.getElementById('index-page');
	SCROLLER = document.getElementById('main_scroll_wrap');
	BOOKMARKS_BLOCK = document.getElementById('bookmarks_block');
	PAGE_OFFSET = getTopOffset(document.getElementById('constitution_body'));
	SOURCES_OFFSET = getTopOffset(sources) + sources.offsetHeight;
    CONSTITUTION_BODY_WRAP = document.getElementById('constitution_body_wrap');

	// Для IE6 подключается не весь функционал, так как иначе он сильно нагружает систему
	if (!IE_VERSION || IE_VERSION > 6)
	{
		addEvent (SCROLLER, 'scroll', renderSearchBlock);
		SEARCH_BLOCK = document.getElementById('search_block');
		SEARCH_FIELD = new ClassSearchBar (document.getElementById('search_field'), 'мгновенный поиск', 'search_block search_block_active', 'search_block', document.getElementById('bookmarkable_content'));
		document.getElementById('search_block').style.display = 'block';
		document.getElementById('search_block').style.display = 'block';
		renderSearchBlock();
	}
	new ClassReferences(document.getElementById('bookmarkable_content'));

    /* Восстановление позиции */
    scrollElement = $('#main_scroll_wrap').get(0);
    restorePosition();

    // Каждую секунду в cookie запоминается элемент, который находится
    // вверху страницы в данный момент и записывается в cookie.

    setInterval(savePosition, 1000);
    //savePosition();
	BOCKMARK_CONTROLLER = new ClassBookmarkController(document.getElementById('bookmarkable_content'), document.getElementById('bookmarks_block'));	//document.getElementById('search_field').onkeyup = searchInput;
	TABS = new ClassTabsController(['table_of_contents', 'index', 'other_info']);
	document.getElementById('bottom_menu_block').style.display = 'block';
	window.index_termins = new ClassIndex('index_content');
	addEvent (SCROLLER, 'scroll', renderBookmarksBlock);
    addEvent (window, 'resize', renderBookmarksBlock);
	renderBookmarksBlock();

    /**
     *  Надстройка для скролла стрелками
     */
    _che = $('<input type="checkbox" style="position:absolute; top:auto; left:-400px;" />').prependTo($('.main_scroll_wrap'));
    _che.
    focus(function() { stat = true }).
    blur(function() { stat = false });
    $(document).keydown(function(event) {
        down = true;

        (function() {
            if (down) {
                if (!$.browser.opera && !$.browser.safari) {
                    if (!stat) {
                        if(event.keyCode in allowedKeyCodes)
                        {
                            _che.css('top', $('.main_scroll_wrap').scrollTop());
                            _che.focus();
                        }
                    }
                }
                else {
                    event = event || window.event;
                    var difference, _scrollTop = $('.main_scroll_wrap').scrollTop();
                    switch (event.keyCode) {
                        case 33:
                            _scrollTop -= 600;
                            break;
                        case 34:
                            _scrollTop += 600;
                            break;
                        case 38:
                            _scrollTop -= 20;
                            break;
                        case 40:
                            _scrollTop += 20;
                            break;
                    }

                    if (event.keyCode in allowedKeyCodes) $('.main_scroll_wrap').get(0).scrollTop = _scrollTop;

                    setTimeout(arguments.callee, 100);
                }
            }
        })();
    });

    $(document).keyup(function() {
        down = false
    });



}


function getTopOffset(object)
{
	var offset = 0;
	var topOffset = 0;
	var leftOffset = 0;
	while (object)
	{
		offset += object.offsetTop;
		object = object.offsetParent;
	}
	return offset;
}

function renderPageOnScroll()
{
	renderSearchBlock();
	renderBookmarksBlock();
}

function renderSearchBlock()
{
	var scroll_top = SCROLLER.scrollTop;
	var offset = PAGE_OFFSET - scroll_top;
	if (offset <= 0)
	{
		if (SEARCH_BLOCK_OFFSET == DEFAULT_SEARCH_BLOCK_OFFSET) return false;
		else
		{
			SEARCH_BLOCK.style.top = DEFAULT_SEARCH_BLOCK_OFFSET + 'px';
			SEARCH_BLOCK_OFFSET == DEFAULT_SEARCH_BLOCK_OFFSET;
		}
	}
	else
	{
		SEARCH_BLOCK.style.top = (offset + DEFAULT_SEARCH_BLOCK_OFFSET) + 'px';
	}
}

/**
 * Изменяет положение блока с закладками
 */
function renderBookmarksBlock()
{
	var scroll_top = SCROLLER.scrollTop;    // Насколько прокручен экран
	var dif = scroll_top - PREVIOUS_SCROLL; // Разница с предыдущим записанным положением
	PREVIOUS_SCROLL = scroll_top;
	var height = BOOKMARKS_BLOCK.offsetHeight;   // Высота блока с закладками
	var scr_height = SCROLLER.offsetHeight - 30; // Высота отображаемой части экрана
	var offset = SOURCES_OFFSET - scroll_top;    // Высота блока с разными сточниками (скан, зип и т. п. в правой колонке)
    BOOKMARKS_BLOCK.style.right = Math.round((SCROLLER.offsetWidth - CONSTITUTION_BODY_WRAP.offsetWidth)) + 'px';
    if (offset <= 0)
	{
		if (BOOKMARKS_BLOCK_OFFSET == DEFAULT_BOOKMARKS_BLOCK_OFFSET && (height<scr_height || dif <=0)) {
            return false;
        } else {
			if (DEFAULT_BOOKMARKS_BLOCK_OFFSET + height > scr_height)
			{
				BOOKMARKS_BLOCK_OFFSET -= dif;
				if (BOOKMARKS_BLOCK_OFFSET > DEFAULT_BOOKMARKS_BLOCK_OFFSET) BOOKMARKS_BLOCK_OFFSET = DEFAULT_BOOKMARKS_BLOCK_OFFSET;
				if (BOOKMARKS_BLOCK_OFFSET < scr_height - height - DEFAULT_BOOKMARKS_BLOCK_OFFSET) BOOKMARKS_BLOCK_OFFSET = scr_height - height - DEFAULT_BOOKMARKS_BLOCK_OFFSET;
				BOOKMARKS_BLOCK.style.top = BOOKMARKS_BLOCK_OFFSET + 'px';
			}
			else
			{
				BOOKMARKS_BLOCK_OFFSET = DEFAULT_BOOKMARKS_BLOCK_OFFSET;
				BOOKMARKS_BLOCK.style.top = BOOKMARKS_BLOCK_OFFSET + 'px';
			}
		}
	}
	else
	{
		BOOKMARKS_BLOCK_OFFSET = (offset + DEFAULT_BOOKMARKS_BLOCK_OFFSET);
		BOOKMARKS_BLOCK.style.top = BOOKMARKS_BLOCK_OFFSET + 'px';
	}
}


/**
 * Класс элемента алфавитного указателя
 * @param {} event
 */
function ClassIndexElement(dContainer, oController)
{
	this.dContainer = dContainer;
	this.tTimer = null;
	this.iTerminHeight = null;
	this.aPointers = [];
	this.dTermin = null;
	var oThis = this;
	var aTemp = this.dContainer.getElementsByTagName('div');
	this.oController = oController;
	for (var j in aTemp)
	{
		if (/term/.test(aTemp[j].className))
		{
			this.dTermin = aTemp[j];
			this.dTermin.getElementsByTagName('a')[0].onclick = function(event){oThis.show(event)}
		}
		if (/pointer/.test(aTemp[j].className))
		{
			this.aPointers.push(aTemp[j]);
		}
	}
	this.slideHide = function()
	{
		var height = this.dContainer.offsetHeight - 6;
		if (height > this.iTerminHeight)
		{
			height -= Math.ceil((height - this.iTerminHeight)/2);
			this.dContainer.style.height = height + 'px';
		}
		else
		{
			for (var i in this.aPointers)
			{
				this.aPointers[i].style.display = 'none';
			}
			this.dContainer.style.height = 'auto';
			this.dContainer.style.overflow = 'auto';
			clearInterval(this.tTimer);
		}

	}

	this.slideOpen = function()
	{
		var height = this.dContainer.offsetHeight - 3;
		if (height > this.dContainer.scrollHeight)
		{
			height += Math.ceil((this.dContainer.scrollHeight - height)/2);
			this.dContainer.style.height = height + 'px';
		}
		else
		{
			this.dContainer.style.height = 'auto';
			this.dContainer.style.overflow = 'auto';
			clearInterval(this.tTimer);
		}

	}

	this.hide = function(event)
	{
		if (!event) event = window.event;
		if (event)
		{
			if (event.preventDefault) event.preventDefault();
			else event.returnValue = false;
		}
		this.dTermin.className = this.dTermin.className.replace(/\s*openned/ig, '');
		this.dContainer.style.overflow = 'hidden';
		this.iTerminHeight = this.dTermin.offsetHeight;
		this.tTimer = setInterval(function(){oThis.slideHide()}, 15);
		this.dTermin.getElementsByTagName('a')[0].onclick = function(event){oThis.show(event)}
	}
	this.show = function(event)
	{
		if (!event) event = window.event;
		if (event)
		{
			if (event.preventDefault) event.preventDefault();
			else event.returnValue = false;
		}
		this.dTermin.className += ' openned';
		this.oController.onOpen(this);
		this.dContainer.style.overflow = 'hidden';
		this.dContainer.style.height = this.dContainer.offsetHeight + 'px';
		for (var i in this.aPointers)
		{
			this.aPointers[i].style.display = 'block';
		}
		this.tTimer = setInterval(function(){oThis.slideOpen()}, 30);
		this.dTermin.getElementsByTagName('a')[0].onclick = function(event){oThis.hide(event)}
	}
}

/**
 * Класс алфавитного указателя
 * @param {} sId
 */
function ClassIndex(sId)
{
	var aTempContainers = document.getElementById(sId).getElementsByTagName('div');
	this.aTermins = new Array();
	this.oPreviousOpen = null;
	this.onOpen = function (oItem)
	{
		if (this.oPreviousOpen && oItem != this.oPreviousOpen) this.oPreviousOpen.hide();
		this.oPreviousOpen = oItem;
	}
	for (var i in aTempContainers)
	{
		if (/item/.test(aTempContainers[i].className))
		{
			this.aTermins.push(new ClassIndexElement(aTempContainers[i], this));
		}
	}
}

function highliteString(event)
{
	if (!event) event = window.event;
	var target = event.target || event.srcElement;
	while (target && !/^(p|h2|h3)$/i.test(target.nodeName)) {target = target.parentNode;}
	if (!target) return false;
	if (PREVIOUS_MARKER && PREVIOUS_MARKER.parentNode == target) return(false);
	var bub=document.createElement('div');
	bub.className = 'marker';
	bub.onclick = addBookmark;
	if (PREVIOUS_MARKER) PREVIOUS_MARKER.parentNode.removeChild(PREVIOUS_MARKER);
	PREVIOUS_MARKER = target.appendChild(bub);
}

function addBookmark(event)
{
	if (!event) event = window.event;
	var target = event.target || event.srcElement;
	target = target;
	for (var i in BOOKMARKS)
	{
		if (target == BOOKMARKS[i])
		{
			BOOKMARKS[i].parentNode.removeChild(BOOKMARKS[i]);
			return(false);
		}
	}
	var adress = target.parentNode.getElementsByTagName('a')[0].name;
	var bub=document.createElement('div');
	BOOKMARKS.push(bub);
	bub.className = 'bookmark bookmark-'+BOOKMARKS.length;
	document.getElementById('bookmarks_block').innerHTML = '<div class="link_wrap"><a href="#'+adress+'" class="bookmark bookmark-'+BOOKMARKS.length+'">'+adress+'<span class="delete">×</span></a></div>' + document.getElementById('bookmarks_block').innerHTML;
	bub.onclick = addBookmark;
	target.parentNode.appendChild(bub);
}

function showMenu(event)
{
	if (!event) event = window.event;
	var target = event.target || event.srcElement;
	document.getElementById(target.id+'-block').style.display = 'block';
	target.className = 'black';
	target.parentNode.className += ' active_tab';
	target.onclick = hideMenu;
		if (event.preventDefault) event.preventDefault();
		else event.returnValue = false;
}

function hideMenu(event)
{
	if (!event) event = window.event;
	var target = event.target || event.srcElement;
	document.getElementById(target.id+'-block').style.display = 'none';
	target.className = '';
	target.onclick = showMenu;
		if (event.preventDefault) event.preventDefault();
		else event.returnValue = false;
}



function testConsole()
{
	var info = document.getElementById('info');
	info.style.display = 'block';
	this.log = function (str)
	{
		info.innerHTML += '<p>' + str + '</p>';
	}
}



/*
 * Функции для работы со строкой поиска
 */

function ClassSearchBar (dInput, sDefaultValue, sCssFilled, sCssEmpty, dTextContainer)
{
	// Конфигурация
	this.iMinLength = 2;    // Минимальная длина слова, после которой начинается поиск
	this.iTypeDelay = 300;  // Задержка в миллисекундах, после которой начинается поиск, введена, чтобы не перегружать браузер ложными запросами во время его печати
	this.iHighlightDelay = 300; // Интервал между итеррациями подсветки результатов
	this.iResultsInPack = 10;   // Максимальное чилсло результатов подсвечиваемых за один заход
	this.sPreviousValue = '';   // Предыдущее значение строки поиска для отслеживания изменений во вводе и фильтрации нажатия управляющих клавиш
	var oThis = this;
	this.sSearchText = document.getElementById('constitution_body').innerHTML.replace(/<[^>]*>/ig, '').replace(/[^А-я 0-9]/ig, ' ').replace(/(\s| ){2,}/ig, ' ').toUpperCase();
	this.dInput = dInput;
	this.sValue = sDefaultValue;
	this.sCssFilled = sCssFilled;
	this.sCssEmpty = sCssEmpty;
	this.dTextContainer = dTextContainer;
	this.tTimer = null;
	this.tHighliteTimer = null;
	this.bClearText = true; // Флаг, указывающий на то, что в тексте нет разметки поиска
	this.aArticleIndex = {};
	this.aSearchResults = {};
	this.dPreviousHighlited = null;
	this.iTotalResults = null;
	this.iLastHighlited = null;
	this.dInfoscroller = null;
	this.aParagraphs = [];
	this.iLastFocused = null;
	this.aParagrapsResult = [];
	this.aParagraphsForCleanup = [];
	var buttons = this.dInput.parentNode.getElementsByTagName('a');
	for (var i in buttons)
	{
		if (/next/.test(buttons[i].className)) this.dNextButton = buttons[i];
		if (/previous/.test(buttons[i].className)) this.dPreviousButton = buttons[i];
	}
	var blocks = this.dInput.parentNode.getElementsByTagName('div');
	for (var i in blocks)
	{
		if (/results_count/.test(blocks[i].className)) this.dCounter = blocks[i];
	}

	// Составление индекса слов для поиска по алфавитному указателю
	this.analizeIndex = function ()
	{
		var start = new Date();
		var aDivs = document.getElementById('index_content').getElementsByTagName('div');
		for (var i in aDivs) // Сканирование контейнеров item
		{
			if (/item/.test(aDivs[i].className))
			{
				var aContent = aDivs[i].getElementsByTagName('div');
				var termin = aContent[0].getElementsByTagName('a')[0].innerHTML.replace(/<.*?>/ig, '');
				for (var j in aContent) // Сканирование вложенных контейнеров
				{
					if (/pointer/.test(aContent[j].className))
					{
						var item = aContent[j].firstChild.nodeValue;
						var aArticles = aContent[j].getElementsByTagName('a');
						for (var t in aArticles)
						{
							if (!aArticles[t].href) continue;
							var article = aArticles[t].href.match(/#(\w+(-\d+)?)/)[1];
							this.aArticleIndex[article] += ' '+termin+' '+aContent[j].innerHTML.replace(/(<.*?>|ст. \d+|[.,:])/ig, '').replace(/\s\d+/, '');
						}
					}
				}
			}
		}
		for (i in this.aArticleIndex) this.aArticleIndex[i] = this.aArticleIndex[i].replace(/[^А-я 0-9]/ig, ' ').replace(/(\s| ){2,}/ig, ' ').toUpperCase();
		end = new Date()
	}
	this.analizeIndex();

	// Кроссбраузерный привязыватель событий :)
	this.addEvent = function (dElement, sEventType, fHandler)
	{
		if (dElement.attachEvent) dElement.attachEvent ('on' + sEventType, fHandler);
		if (dElement.addEventListener) dElement.addEventListener (sEventType, fHandler, false);
	}

	// Функции управления кнопками
	this.disableNextButton = function ()
	{
		this.dNextButton.className = this.dNextButton.className.replace(/\s*next_active\s*/, '');
		this.dNextButton.onclick = null;
	}
	this.disablePreviousButton = function ()
	{
		this.dPreviousButton.className = this.dPreviousButton.className.replace(/\s*previous_active\s*/, '');
		this.dPreviousButton.onclick = null;
	}
	this.enableNextButton = function ()
	{
		if (!/next_active/.test(this.dNextButton.className)) this.dNextButton.className += ' next_active';
		this.dNextButton.onclick = function() {return oThis.findNext()};
	}
	this.enablePreviousButton = function ()
	{
		if (!/previous_active/.test(this.dPreviousButton.className)) this.dPreviousButton.className += ' previous_active';
		this.dPreviousButton.onclick = function() {return oThis.findPrevious()};
	}
	this.disableButtons = function ()
	{
		this.disableNextButton();
		this.disablePreviousButton();
	}

	// Функция поиска по основному тексту
	this.searchParagraphs = function (regex)
	{
		var count = 0;
		var length = this.aParagraphs.length;
		for (var i = 0; i < length; i++)
		{
			var tested_text = this.aParagraphs[i].body.innerHTML;
			regex.lastIndex = 0;
			var condition = regex.test(tested_text);
			if (condition)
			{
				this.aParagrapsResult.push(this.aParagraphs[i]);
				count++;
			}
			else
			{var condition1 = regex.test(tested_text);
			}
		}
		return count;
	}

	// Подсветка следующего результата
	this.findNext = function(dElement)
	{
		var scroll_element = document.getElementById('main_scroll_wrap');
		var jump = true;
		if (this.iLastFocused === null || this.iLastFocused + 2 > this.aSearchResults.length) this.iLastFocused = 0;
		else this.iLastFocused++;
		if (this.dPreviousHighlited && this.dPreviousHighlited.className != '') this.dPreviousHighlited.className = '';
		if (dElement)
		{
			var top = getTopOffset(dElement)+60;
			for (var i in this.aSearchResults)
			{
				this.aSearchResults[i];
				if (getTopOffset(this.aSearchResults[i]) > top)
				{
					this.iLastFocused = i-1;
					jump = false;
					break;
				}
			}
		}
		this.dPreviousHighlited = this.aSearchResults[this.iLastFocused];
		this.dPreviousHighlited.className = 'active';
		if (jump) scroll_element.scrollTop = getTopOffset(this.dPreviousHighlited) - 30;
		this.dCounter.innerHTML = this.dCounter.innerHTML.replace (/\d+ (из \d+)/, (this.iLastFocused*1+1)+' $1');
		if (this.iLastFocused <= 0) this.disablePreviousButton();
		else this.enablePreviousButton();
		this.dInput.focus();
	}

	// Подсветка предыдущего результата
	this.findPrevious = function ()
	{
		var scroll_element = document.getElementById('main_scroll_wrap');
		if (!this.iLastFocused)
		{
			this.disablePreviousButton();
			return false;
		}
		else this.iLastFocused--;
		if (this.dPreviousHighlited && this.dPreviousHighlited.className != '') this.dPreviousHighlited.className = '';
		this.dPreviousHighlited = this.aSearchResults[this.iLastFocused];
		this.dPreviousHighlited.className = 'active';
		scroll_element.scrollTop = getTopOffset(this.dPreviousHighlited) - 10;
		this.dCounter.innerHTML = this.dCounter.innerHTML.replace (/\d+ (из \d+)/, (this.iLastFocused+1)+' $1');
		if (this.iLastFocused <= 0) this.disablePreviousButton();
		else this.enablePreviousButton();
	}

	// Добавление элемента в инфоскроллер
	this.markInfoscroller = function (dElement, dInfoscroller, iDocHeight)
	{
		this.iTotalResults++;
		var iNumber = this.iTotalResults;
		var marker = document.createElement('a');
		var href = dElement.getElementsByTagName('a');
		if (href[0]) marker.href = '#' + href[0].name;
		marker.onclick = function(){oThis.findNext(dElement)};
		var top = getTopOffset(dElement);
		var percent = top/iDocHeight*100;
		marker.style.top = percent + '%';
		dInfoscroller.appendChild(marker);
	}

	// Добавление элементов в массив подсветки
	this.selectHightited = function ()
	{
		this.aSearchResults = document.getElementsByTagName('ins');
		this.dCounter.innerHTML = this.dCounter.innerHTML.replace (/(\d+) из (\d+)/, '$1 из ' + this.aSearchResults.length);
		this.enableNextButton();
	}

	// Очисктка результатов предыдущего поиска
	this.clearSearchResult = function ()
	{
		this.iTotalResults = 0;
		var count = 0;
		this.dCounter.parentNode.style.display = 'none';
		if (this.dPreviousHighlited && this.dPreviousHighlited.className != '') this.dPreviousHighlited.className = null;
		var paragraph = null;
		while (paragraph = this.aParagraphsForCleanup.pop())
		{
			paragraph.innerHTML = paragraph.innerHTML.replace(/<\/?ins.*?>/ig, '');
			restoreReferences(paragraph); // КОСТЫЛЬ для восстановления ссылок на сноски после изменения тела документа
			count++;
		}
		this.aParagrapsResult = [];
		this.bClearText = true;
		this.disableButtons();
		if (this.dInfoscroller)
		{
			this.dInfoscroller.parentNode.removeChild(this.dInfoscroller);
			this.dInfoscroller = null;
		}
		this.dPreviousHighlited = null;
		this.sPreviousValue = null;
		var end = new Date();
	}

	this.startSearch = function()
	{
		var clear_value = this.dInput.value.replace(/[^А-я0-9]/g, '');
		if (clear_value.length == 0 && !this.bClearText) this.clearSearchResult();
		if ((clear_value.length < this.iMinLength && !/^\d+$/.test(this.dInput.value))||clear_value==this.sPreviousValue)
		{
			return false;
		}
		this.sPreviousValue = clear_value;
		if (!this.bClearText)
		{
			this.clearSearchResult();
		}
		if (!IE_VERSION || IE_VERSION>7)
		{
			this.dInfoscroller = document.createElement('div');
			this.dInfoscroller.className="infoscroller_container";
			this.dInfoscroller = document.getElementsByTagName('body')[0].appendChild(this.dInfoscroller);
		}
		this.iLastFocused = null;
		if (this.tHighliteTimer)
		{
			clearTimeout(this.tHighliteTimer);
			this.tHighliteTimer = null;
		}

		this.iLastHighlited = 0;
		var additional_results = [];
		var count_regex = this.dInput.value.replace(/<[^>]*>/ig, '').replace(/[^А-я 0-9]/ig, ' ').replace(/(\s| ){2,}/ig, ' ').toUpperCase();
		count_regex = new RegExp('('+count_regex+')', 'ig');
		var string = this.dInput.value;
		string = string.replace(/(\s| )*(.*?)(\s| )*/, '$2'); // Обрезаются краевые пробелы
		string = string.split(/[\s ]+/).join('[\\s| ]*?');
		var regex = new RegExp('('+string+')', 'ig');   //

		var count = this.searchParagraphs(regex);
		for (var i in this.aArticleIndex)
		{
			if (count_regex.test(this.aArticleIndex[i])) additional_results.push(i);
		}
		if (count + additional_results.length <= 0)
		{
			this.clearSearchResult();
			this.dCounter.innerHTML = 'не найдено';
			this.bClearText = false;
			this.dCounter.parentNode.style.display = 'block';
			return false;
		}
		this.dCounter.innerHTML = '1 из ' + (additional_results.length + count);
		this.dCounter.parentNode.style.display = 'block';
		this.highliteAdditional(additional_results);
		this.highliteByTimer(regex);
		this.tHighliteTimer = setTimeout(function(){oThis.highliteByTimer(regex)}, this.iHighlightDelay*3);
		this.findNext();
	}

	this.highliteByTimer = function (regex)
	{
		var scroll_element = document.getElementById('main_scroll_wrap');
		var doc_height = scroll_element.scrollHeight;
		var length = this.aParagrapsResult.length;
		var count = 0;
		for (var i = this.iLastHighlited; i < length; i++)
		{
			this.aParagraphsForCleanup.push(this.aParagrapsResult[i].body);
			this.aParagrapsResult[i].body.innerHTML = this.aParagrapsResult[i].body.innerHTML.replace(regex, '<ins>$1</ins>');
			restoreReferences(this.aParagrapsResult[i].body); // КОСТЫЛЬ для восстновления ссылок на сноски
			if (!IE_VERSION || IE_VERSION>7) this.markInfoscroller(this.aParagrapsResult[i].body, this.dInfoscroller, doc_height)
			count++;
			this.iLastHighlited = i+1;
			if (count >= this.iResultsInPack)
			{
				break;
			}
		}
		if (this.iLastHighlited < length - 1) this.tHighliteTimer = setTimeout(function(){oThis.highliteByTimer(regex)}, this.iHighlightDelay);
		else this.tHighliteTimer = null;
		this.selectHightited();
	}

	this.highliteAdditional = function (additional_results)
	{
		var scroll_element = document.getElementById('main_scroll_wrap');
		var doc_height = scroll_element.scrollHeight;
		var length = additional_results.length;
		if (length>0)
		{
			for (var i = 0; i < length; i++)
			{
				var elements = document.getElementsByName(additional_results[i]);
				var header = elements[0]&&elements[0].parentNode;
				if (!header) continue;
				this.aParagraphsForCleanup.push(header);
				header.innerHTML = '<ins>'+header.innerHTML+'</ins>';
				if (!IE_VERSION || IE_VERSION>7) this.markInfoscroller(header, this.dInfoscroller, doc_height)
			}
		}

		this.bClearText = false;
	}

	this.onFocus = function()
	{
		if (this.dInput.value == this.sValue) this.dInput.value = '';
		this.dInput.parentNode.parentNode.className = this.sCssFilled;
	}

	this.onKeyDown = function()
	{
		this.dInput.parentNode.parentNode.className = this.sCssFilled;;
	}

	this.onKeyUp = function(event)
	{
		var oThis = this;
		if (this.tTimer) clearTimeout(this.tTimer);
		if (!event) event = window.event;
		if (event.keyCode == 13 && this.dPreviousHighlited)
		{
			this.findNext();
			return false;
		}
		this.tTimer = setTimeout(function(){return oThis.startSearch()}, this.iTypeDelay);
	}

	this.onBlur = function()
	{
		if (this.dInput.value == '' || this.dInput.value == this.sValue)
		{
			this.dInput.value = this.sValue;
			this.dInput.parentNode.parentNode.className = this.sCssEmpty;
		}
		else
		{
			this.dInput.parentNode.parentNode.className = this.sCssFilled;
		}
	}

	this.selectInputText = function ()
	{
		var start = 0;
		var end = this.dInput.value.length;
		this.dInput.focus();
		if (this.dInput.setSelectionRange) this.dInput.setSelectionRange(start, end);
	}

	this.getParagraphSource = function (sTag)
	{
		var paragraphs = this.dTextContainer.getElementsByTagName(sTag);
		for (var i in paragraphs)
		{

			if (paragraphs[i].nodeType != 1) continue;
			paragraphs[i].innerHTML = '<span>'+paragraphs[i].innerHTML+'</span>';
			this.aParagraphs.push({'body': paragraphs[i].getElementsByTagName('span')[0], 'type': sTag});
		}
	}

	this.getParagraphSource('h2');
	this.getParagraphSource('h3');
	this.getParagraphSource('p');

	link = location.href.match(/#(.*)/);
	if (link && link[1]) location.href = '#' + link[1]; //Устраняет прыжок куда-попало при удалении якоря из ссылки в процессе модификации дерева сайта

	this.addEvent(this.dInput, 'focus', function() {return oThis.onFocus()});
	this.addEvent(this.dInput, 'click', function(){oThis.selectInputText()});
	this.addEvent(this.dInput, 'blur',  function() {return oThis.onBlur()});
	this.addEvent(this.dInput, 'keydown', function() {return oThis.onKeyDown()});
	this.addEvent(this.dInput, 'keyup', function(event) {return oThis.onKeyUp(event)});


	if (this.dInput.value == '') this.onBlur();

	return this;
}


/*
 * Класс закладки
 */
function ClassBookmark (oController, aParagraph, sTitle, sColor, sClass, bJump, iTop)
{
	var oThis = this;
	this.iArticle = null;
	this.iChapter = null;
	this.sCrumbs = null;
	this.sColor = sColor;
	this.aParagraph = aParagraph;
	this.sTitle = sTitle;
	this.iTop =iTop;
	this.oController = oController;
	this.sClass = sClass;
	this.sUrl = aParagraph.url;
	this.dScroller = document.getElementById('main_scroll_wrap');
	this.aChapters = [0, 1, 17, 65, 80, 94, 110, 118, 130, 134];
	this.iChaptersLenght = this.aChapters.length;
	/**
	 *  Метод преобразует адрес якоря в имя для закладки с учетом главы (или раздела), статьи и
	 *  в кототом она находится
	 *
	 *  @param {string} sUrl якорь текущей закладки, например #article-16-2
	 *  @return {string}
	 */
	this.transformUrlToBookmarkInfo = function(sUrl)
	{
		if (typeof sUrl != 'string') return false;
		if (/article/.test(sUrl))
		{
			var info = sUrl.match(/\w+-(\d+)-?(.*)/);
			this.iArticle = info[1];
			this.iChapter = 0
			var i=0;
			do {this.iChapter = i; i++} while (this.aChapters[i] && this.aChapters[i] <= this.iArticle);
			if (info[2]) this.sCrumbs = info[2].replace(/-/, '.');
		}
		if (/chapter/.test(sUrl))
		{
			var info = sUrl.match(/\w+-(\d+)/);
			this.iChapter = info[1];
		}
		if (/conclusion/.test(sUrl))
		{
			var info = sUrl.match(/\w+-(.*)?/);
			this.iChapter = 'Закл. ';
			this.iArticle = null;
			if (info) this.sCrumbs = info[1].replace(/-/, '.');
			this.bIsConclusion = true;
		}
	}

	/**
	 * Метод изменения текста закладки
	 * @param {string} sTitle HTML нового заголовка
	 */

	this.refreshTitle = function(sTitle, sChapterClass)
	{
		this.dLink.innerHTML = sTitle;
		this.dBookmark.className = this.dBookmark.className.replace(/ wo_chapter[\w_]*/ig, '');
		this.dBookmark.className = this.dBookmark.className.replace(/ conclusion/ig, '');
		this.dBookmark.className += ' ' + sChapterClass;
	}

	this.deleteBookmark = function (event)
	{
		if (!event) event = window.event;
		if (event.preventDefault) event.preventDefault();
		else event.returnValue = false;
		this.dMarker.parentNode.removeChild(this.dMarker);
		this.dBookmark.parentNode.removeChild(this.dBookmark);
		this.oController.deleteBookmark(this);
	}
	if (bJump)
	{
		//var top = this.dScroller.scrollTop;         ///!!!!!!!!!!!!!!!!!!!!!!!!!!
		//location.href = '#' + this.aParagraph.url;
		// this.dScroller.scrollTop = top;             ///!!!!!!!!!!!!!!!!!!!!!!!!!!
	}
	
	// Маркер напротив статьи
	this.dMarker = document.createElement('a');
		this.dMarker.href = '#'+this.aParagraph.url;
		this.dMarker.innerHTML = '<div style="background-color: '+this.sColor+'"></div>';
		this.dMarker.className='bookmark';
		//this.dMarker.style.backgroundColor = this.sColor;
		this.dMarker.onclick = function(event){oThis.deleteBookmark(event)};
		this.aParagraph.body.appendChild(this.dMarker);
	
	// Добавление закладки
	this.dBookmark = document.createElement('div');
		this.dBookmark.className = 'bookmark ' + this.sClass;
		this.dBookmark.onmouseover = function (){oThis.dBookmark.className += ' active_bookmark';}
		this.dBookmark.onmouseout = function (){oThis.dBookmark.className = oThis.dBookmark.className.replace(/ active_bookmark/ig, '');}
		var link = document.createElement('a');
		link.href = '#'+this.aParagraph.url;

		///// title у ссылки
		var sTitleText = $(this.aParagraph.body).text();
			//this.aParagraph.body.innerHTML.replace(/<\/?[^>]+>/gi, ''); // Удалили тэги из текста
		sTitleText = sTitleText.replace(/^\s*\d+\.\s*/, ''); // Удалили номера параграфов, чтобы не дублировать
			//sTitleText = sTitleText.replace(/(\s{2,} | &nbsp; )/, ' '); // Удалили дублирующиеся пробелы
		link.title = sTitleText.search(/[.;:]/) >= 0 ? (sTitleText.substr(0, sTitleText.search(/[.;:]/))+'.') : sTitleText;
		/////
		
		this.dBookmark.style.color = sColor;
		this.dBookmark.style.borderBottomColor = sColor;
		this.transformUrlToBookmarkInfo(this.aParagraph.url);
		link.innerHTML = sTitle;
		del = document.createElement('a');
		del.className = 'delete';
		del.innerHTML = '×';
		del.onmouseup = function(event){oThis.deleteBookmark(event)};
		this.dLink = this.dBookmark.appendChild(link);
		this.dBookmark.appendChild(del);
	return this;
}

/*
 * Класс, управляющий закладками
 *
 */

function ClassBookmarkController(dTextContainer, dBookmarksContainer)
{
	var oThis = this;
	this.dTextContainer = dTextContainer;
	this.dBookmarksContainer = dBookmarksContainer;
	this.dBookmarksBlock = document.createElement('div');
		this.dBookmarksBlock.className = "wrap";
		this.dBookmarksContainer.appendChild(this.dBookmarksBlock);
	this.dDeleteAll = document.createElement('div');
		this.dDeleteAll.className = 'bookmark delete_all';
		var button = document.createElement('a');
		button.innerHTML = 'Удалить закладки';
		button.onclick = function(event){oThis.deleteAllBookmarks(event);}
		this.dDeleteAll.appendChild(button);
		this.dDeleteAll.style.display = 'none';
		this.dBookmarksContainer.appendChild(this.dDeleteAll);
	this.aParagraphs = [];
	this.dCurrentMarked = null;
	this.iCurrentMarkedItem = null;
	this.aBookmarks ={};
	this.aColors = ['#f34949', '#f34949', '#f34949', '#f35b4d', '#f39858', '#efc96a', '#b6d984', '#72e0a3', '#4de1bd', '#4dddd7', '#54d4eb', '#6bc3f5', '#91a7ed', '#c086db', '#e66ecc', '#ed71ca', '#ed89d1', '#eda0d8', '#e3b7d7', '#dcc1d5', '#dcc1d5', '#d2d2d4'];
	
	this.mColors = ['#8e4a4d', '#8e4a4d', '#8e4a4d', '#8e514f', '#8e6953', '#8d7d5a', '#768365', '#568671', '#4c867c', '#4c8586', '#4f818c', '#587a92', '#676f8f', '#7a6288', '#895882', '#8c5a81', '#8c6384', '#8c6c86', '#887686', '#857a85', '#857a85', '#818085'];
	
	this.refreshBookmarks = function ()
	{
		var temp_arr = [];
		for (var i in this.aBookmarks)
		{
			var chapter = this.aBookmarks[i].iChapter;
			var article = this.aBookmarks[i].iArticle;
			if (this.aBookmarks[i].sCrumbs) var crumbs = parseInt(this.aBookmarks[i].sCrumbs.replace('.', ''));
			else crumbs = 0;
			if (isNaN(article)) article = 0;
			if (isNaN(chapter)) chapter = 15;
			var top = chapter*10000+article*1000+crumbs;
			temp_arr.push([top, this.aBookmarks[i]]);
		}
		temp_arr.sort(function(first, second){return(first[0]-second[0]);});
		var chapter = 0;
		var new_title = '';
		var wo_chapter = false;
		while (temp_bookmark = temp_arr.shift())
		{
			temp_bookmark = temp_bookmark[1];
			if (temp_bookmark.iChapter && chapter != temp_bookmark.iChapter)
			{
				chapter = temp_bookmark.iChapter;
				new_title = '<span class="chapter">'+temp_bookmark.iChapter+'</span>';
				if (temp_bookmark.iArticle) new_title += '<span class="article">.'+temp_bookmark.iArticle+'</span>';
				wo_chapter = false;
				if (temp_bookmark.bIsConclusion) // Заключения ведут себя не так, как все остальные закладки, поэтому для них ветвление
				{
					wo_chapter = 'conclusion';
					if (temp_bookmark.sCrumbs) new_title += '<span class="crumbs">'+temp_bookmark.sCrumbs+'</span>';
				}
				else
				{
					if (temp_bookmark.sCrumbs) new_title += '<span class="crumbs">.'+temp_bookmark.sCrumbs+'</span>';
				}
			}
			else
			{
				new_title = '';
				if (temp_bookmark.iArticle) new_title += '<span class="article">'+temp_bookmark.iArticle+'</span>';
				if (temp_bookmark.sCrumbs && !temp_bookmark.bIsConclusion) new_title += '<span class="crumbs">.'+temp_bookmark.sCrumbs+'</span>';
				wo_chapter = 'wo_chapter';
				if (temp_bookmark.bIsConclusion)
				{
					if (temp_bookmark.sCrumbs) new_title += '<span class="crumbs">'+temp_bookmark.sCrumbs+'</span>';
					wo_chapter = 'wo_chapter_conclusion';
				}
			}
			temp_bookmark.refreshTitle(new_title, wo_chapter);
		}
	}
	
	this.addBookmark = function (event, iItem, bJump)
	{
		if (!event) event = window.event;
		if (event && event.button > 1) return false;

		var color="#d2d2d4";
		var scroll_element = document.getElementById('main_scroll_wrap');
		var doc_height = scroll_element.scrollHeight;
		var cur_top = getTopOffset(this.aParagraphs[iItem].body);
		var i_color = Math.floor((cur_top/doc_height)*this.aColors.length);
		color = this.aColors[i_color];
		var before_i = 0;
		var next_top = 10000000;
		for (i in this.aBookmarks)
		{
			if (this.aBookmarks[i] && this.aBookmarks[i].iTop > cur_top && this.aBookmarks[i].iTop < next_top)
			{
				before_i = i;
				next_top = this.aBookmarks[i].iTop;
			}
		}
		this.aBookmarks[this.aParagraphs[iItem].url] = new ClassBookmark(this, this.aParagraphs[iItem], '', color, '', bJump, cur_top);
		if (before_i)
		{
			this.dBookmarksBlock.insertBefore(this.aBookmarks[this.aParagraphs[iItem].url].dBookmark, this.aBookmarks[before_i].dBookmark);
		}
		else
		{
			this.dBookmarksBlock.appendChild(this.aBookmarks[this.aParagraphs[iItem].url].dBookmark);
		}

		this.dDeleteAll.style.display = 'block';
		var str = '';
		for (i in this.aBookmarks)
		{
			if (this.aBookmarks[i]) str += '#' + i;
		}
		str = 'bookmarks='+encodeURIComponent(str)+'; max-age=315360000;'
		document.cookie = str;
		this.refreshBookmarks();
	}

	this.deleteBookmark = function (oBookmark)
	{
		this.aColors[oBookmark.sColor] = true;
		delete (this.aBookmarks[oBookmark.sUrl]);
		var hide_delete_all = true;
		for (var i in this.aBookmarks)
		{
			if (this.aBookmarks[i]) hide_delete_all = false;
		}
		if (hide_delete_all) this.dDeleteAll.style.display = 'none';
		var str = '';
		for (i in this.aBookmarks)
		{
			if (this.aBookmarks[i]) str += '#' + i;
		}
		str = 'bookmarks='+encodeURIComponent(str)+'; max-age=315360000;'
		document.cookie = str;
		this.refreshBookmarks();
	}

	this.deleteAllBookmarks = function(event)
	{
		for (var i in this.aBookmarks)
		{
			if (this.aBookmarks[i]) this.aBookmarks[i].deleteBookmark(event);
		}
		this.aBookmarks = {};
	}

	this.highlighteParaggraphMarker = function (iItem)
	{
		if (this.iCurrentMarkedItem == iItem) return false;
		if (this.dCurrentMarked) this.dCurrentMarked.parentNode.removeChild(this.dCurrentMarked);
		if (this.aBookmarks[this.aParagraphs[iItem].url])
		{
			this.dCurrentMarked = null;
			this.iCurrentMarkedItem = null;
			return false;
		}
		var bub=document.createElement('a');
		bub.href='#'+this.aParagraphs[iItem].url;
		bub.className = 'marker';
		bub.innerHTML = '<div></div>';
		this.dCurrentMarked = this.aParagraphs[iItem].body.appendChild(bub);
		this.dCurrentMarked.onmousedown = function(event){oThis.addBookmark(event, iItem, true);};
		this.iCurrentMarkedItem = iItem;
	}

	this.getParagraphSource = function (sTag)
	{
		var paragraphs = this.dTextContainer.getElementsByTagName(sTag);
		for (var i in paragraphs)
		{
			if (paragraphs[i].nodeType != 1) continue;
			var url = paragraphs[i].getElementsByTagName('a')[0];
			if (!url) continue;
			else url = url.name;
			this.aParagraphs.push({'body': paragraphs[i], 'url': url, 'type': sTag});
			var additional_area = document.createElement('div');
			additional_area.className = 'additional_area';
			paragraphs[i].appendChild(additional_area);
			var item = oThis.aParagraphs.length - 1;
			(function (item){
				paragraphs[i].onmouseover = function(){
					return oThis.highlighteParaggraphMarker(item);
					};
				})(item);
		}
	}

	this.getParagraphSource('p');
	this.getParagraphSource('h2');
	this.getParagraphSource('h3');

	if (/bookmarks=[^\s;]/.test(document.cookie))
	{
		var bookmarks = decodeURIComponent(document.cookie).match(/#([^#;]*)/g);
		for (var j in bookmarks) {if (typeof bookmarks[j] == 'string') bookmarks[j] = bookmarks[j].substring(1);}
		for (var i in this.aParagraphs)
		{
			for (var j in bookmarks)
			{
				if (this.aParagraphs[i] && this.aParagraphs[i].url == bookmarks[j]) this.addBookmark(false, i, false);
			}
		}
		renderPageOnScroll();
	}
	/*else
	{
		var link = location.href.match(/#(.*)/);
		if (link) link = link[1];
		else return false;
		for (var i in this.aParagraphs)
		{
			if (this.aParagraphs[i].url == link)
			{
				this.addBookmark(false, i, false);
				this.refreshBookmarks();
				break;
			}
		}
	}   */
	
	// Постановка закладки, если передана ссылка
	var link = location.href.match(/#(.*)/),
		element,
		_iColor;
	if (link) {
		for (var i in this.aParagraphs) {
			if (this.aParagraphs[i].url == link[1]) {
				var scrollElement = $('#main_scroll_wrap'),
					docHeight = scrollElement.get(0).scrollHeight,
					curTop = getTopOffset(this.aParagraphs[i].body),
					iColor = Math.floor((curTop/docHeight) * this.mColors.length),
					color = this.mColors[iColor];
				
				$('<a href="#' + link[1] + '" class="bookmark"></a>').
					appendTo($(this.aParagraphs[i].body)).
					click(function() { $(this).remove() }).
					html('<div style="background-color:' + color + '" />');
				break;
			}
		}
		
		//location.href = '#' + link[1];
	}
}

/*
 * Класс, управляющий табами
 */

function ClassTabsController (aTabsIds)
{
	oThis = this;
	this.iTabsOpen = 0;
	this.aTabs = {};
	this.dControllerBody = null;
	this.sPreviousShown = null;
	this.aTabsIds = aTabsIds;
	this.iScreenHeight = document.documentElement.clientHeight||window.innerHeight;
	this.iTabsControllerHeight = null;

	this.refreshGabbarites = function(sTabId)
	{
		var tab_height = this.dControllerBody.offsetHeight;
		this.iScreenHeight = document.documentElement.clientHeight||window.innerHeight;
		this.aTabs[sTabId].iFullHeight = (this.aTabs[sTabId].dWrap.scrollHeight < (this.iScreenHeight - this.aTabs[sTabId].dBody.offsetHeight - tab_height))?this.aTabs[sTabId].dWrap.scrollHeight:((this.iScreenHeight - this.aTabs[sTabId].dBody.offsetHeight - tab_height));
		if (sTabId == 'index') this.aTabs[sTabId].iFullHeight = this.iScreenHeight/2;

		this.iTabsControllerHeight = this.dControllerBody.offsetHeight;
	}

	this.showWindow = function (sTabId)
	{
		if (this.aTabs[sTabId].iCurrentHeight < this.aTabs[sTabId].iFullHeight)
		{
			this.aTabs[sTabId].iCurrentHeight += Math.ceil((this.aTabs[sTabId].iFullHeight - this.aTabs[sTabId].iCurrentHeight)/2);
			this.aTabs[sTabId].dWindow.style.height = this.aTabs[sTabId].iCurrentHeight + 'px';
			this.aTabs[sTabId].dWrap.style.height = this.aTabs[sTabId].iCurrentHeight + 'px';
		}
		else
		{
			clearInterval(this.aTabs[sTabId].tInterval);
			this.aTabs[sTabId].sStatus = 'showen';
			this.aTabs[sTabId].tInterval = null;
			this.sPreviousShown = sTabId;
			document.getElementsByTagName('body')[0].onclick = function(event){oThis.hideAll(event);}
			this.dControllerBody.className = this.dControllerBody.className.replace(" move_now", '');
		}
	}

	this.hideWindow = function (sTabId)
	{
		if (this.aTabs[sTabId].iCurrentHeight > 0)
		{
			this.aTabs[sTabId].iCurrentHeight -= Math.ceil((this.aTabs[sTabId].iCurrentHeight)/2);
			this.aTabs[sTabId].dWindow.style.height = this.aTabs[sTabId].iCurrentHeight + 'px';
			this.aTabs[sTabId].dWrap.style.height = this.aTabs[sTabId].iCurrentHeight + 'px';
		}
		else
		{
			this.aTabs[sTabId].dWindow.style.display = 'none';
			clearInterval(this.aTabs[sTabId].tInterval);
			this.aTabs[sTabId].sStatus = 'hidden';
			this.aTabs[sTabId].tInterval = null;
			this.dControllerBody.className = this.dControllerBody.className.replace(" move_now", '');
			if (this.isAllHidden())
			{

			}

		}
	}

	this.isAllHidden = function ()
	{
		var all_hidden = true;
		for (var i in this.aTabs)
		{
			if (this.aTabs[i].sStatus == 'showen') all_hidden = false;
		}
		return all_hidden;
	}

	this.hideAll = function (event)
	{
		if (!event) event = window.event;
		if (event)
		{
			if (event.preventDefault) event.preventDefault();
			else event.returnValue = false;
		}
		for (var i in this.aTabs)
		{
			if (this.aTabs[i].sStatus == 'showen')
			{
				this.iTabsOpen--;
				this.dControllerBody.className = this.dControllerBody.className.replace(/\sbottom_menu_block_openned/ig, '');
				this.aTabs[i].dBody.className = this.aTabs[i].dBody.className.replace(/\s*openned/ig, '');
				(function (i){
					oThis.aTabs[i].tInterval = setInterval(function(){oThis.hideWindow(i)}, 10);
					})(i);
				this.aTabs[i].dBody.className = this.aTabs[i].dBody.className.replace(/\s\S+active\s+active_tab/g, '');
			}
		}
		this.sPreviousShown = null;
		document.getElementsByTagName('body')[0].onclick = null;
	}

	this.clickOnTab = function(event, sTabId)
	{
		if (!event) event = window.event;
		if (event.preventDefault) event.preventDefault();
		else event.returnValue = false;
		if (this.aTabs[sTabId].tInterval) return false;
		if (this.aTabs[sTabId].sStatus == 'hidden')
		{
			this.hideAll();
			if (this.aTabs[sTabId].tInterval)
			{
				clearInterval(this.aTabs[sTabId].tInterval);
				this.aTabs[sTabId].tInterval = null;
			}
			this.iTabsOpen++;
			this.aTabs[sTabId].dWindow.style.display = 'block';
			this.refreshGabbarites(sTabId);
			this.dControllerBody.className += ' bottom_menu_block_openned';
			this.dControllerBody.className += " move_now";
			this.aTabs[sTabId].dBody.className += ' openned';
			this.aTabs[sTabId].tInterval = setInterval(function(){oThis.showWindow(sTabId)}, 15);
			this.aTabs[sTabId].dBody.className += ' '+sTabId+'_active active_tab';
		}
		if (this.aTabs[sTabId].sStatus == 'showen')
		{
			this.iTabsOpen--;
			if (!this.iTabsOpen) this.dControllerBody.className = this.dControllerBody.className.replace(/\sbottom_menu_block_openned/ig, '');
			this.dControllerBody.className += " move_now";
			this.aTabs[sTabId].dBody.className = this.aTabs[sTabId].dBody.className.replace(/\s*openned/ig, '');
			this.aTabs[sTabId].tInterval = setInterval(function(){oThis.hideWindow(sTabId)}, 10);
			this.aTabs[sTabId].dBody.className = this.aTabs[sTabId].dBody.className.replace(/\s\S+active\s+active_tab/g, '');
		}
	}

	for (var i in this.aTabsIds)
	{
		var tab_id = this.aTabsIds[i];
		var tab = {};
		tab.dLink = document.getElementById(this.aTabsIds[i]);
		(function (tab_id){
			tab.dLink.onclick = function(event){
				return oThis.clickOnTab(event, tab_id);
				};
			})(tab_id);
		tab.dBody = tab.dLink;
		tab.sStatus = 'hidden';
		tab.tInterval = null;
		tab.iCurrentHeight = 0;
		while (!/tab/.test(tab.dBody.className)) tab.dBody = tab.dBody.parentNode;
		tab.dWindow = document.getElementById(this.aTabsIds[i]+'-block');
		tab.dWrap = tab.dWindow.getElementsByTagName('div')[0];
		tab.dBody.onclick = stopIt;
		tab.dWindow.onclick = stopIt;
		tab.dWindow.style.height = '0px';
		tab.dWindow.style.display = 'none';
		tab.iFullHeight = (tab.dWindow.scrollHeight < this.iScreenHeight - tab.dBody.offsetHeight)?tab.dWindow.scrollHeight:(this.iScreenHeight - tab.dBody.offsetHeight);
		this.aTabs[this.aTabsIds[i]] = tab;
		this.dControllerBody = tab.dBody.parentNode;
	}
}


function stopIt(event)
{
	if (!event) event = window.event;
	if (event.stopPropagation) event.stopPropagation();
	else event.cancelBubble = true;
}


/*
 * Класс, управляющий слносками
 */
function ClassReferences(dTextBody)
{
	var aBlocks = dTextBody.getElementsByTagName('div');

	for (var i in aBlocks)
	{
		if (/reference/.test(aBlocks[i].className))
		{
			aBlocks[i].style.display = 'none';
			var ref_lnk_body = aBlocks[i].previousSibling;
			while (ref_lnk_body.nodeType != 1) ref_lnk_body = ref_lnk_body.previousSibling;
			var links = ref_lnk_body.getElementsByTagName('a');
			for (var j in links)
			{
				if (/reference/.test(links[j].href))
				{
					links[j].style.className = 'dashed';
					links[j].onclick=showRef;
				}
			}
		}
	}
}

function restoreReferences(dParagraph)
{
	var links = dParagraph.getElementsByTagName('a');
	for (var j in links)
	{
		if (!links[j]) continue;
		if (/reference/.test(links[j].href))
		{
			links[j].style.className = 'dashed';
			links[j].onclick=showRef;
		}
	}
}

function showRef(event)
{
	if (!event) event=window.event;
	if (event.preventDefault) event.preventDefault();
	else event.returnValue = false;
	var target = event.target || event.srcElement;

	var paragraph = target;
	while (!/^(p|h\d)$/i.test(paragraph.tagName)) {paragraph=paragraph.parentNode;}
	var block = paragraph;
	while (!/reference/.test(block.className)) block = block.nextSibling;

	if (block.offsetHeight == 0)
	{
		paragraph.className += ' ref_op';
		block.style.display = 'block';
	}
	else
	{
		paragraph.className = paragraph.className.replace(/(\s*ref_op)+/ig, '');
		block.style.display = 'none';
	}
}





/*
 * Сохранение позиции на которой находится читатель.
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------
 * @author Alexeenko Igor (o0@artgorbunov.ru)
 * @requires jQuery (jquery.com)
 * @param none
 */

// Перемещение пользователя на место на котором он закрыл окно в прошлый раз
function restorePosition(){
    var topElement = returnCookie('topElement');


    topOffset = (isNaN(topElement)) ? ($('a[name=' + topElement + ']').parent().offset().top) : topElement;


    $(scrollElement).scrollTop(topOffset);
}

function savePosition() {
    var jPrevious ; // Элемент, который частично обрезается экраном
    var jParent;
    scroll = scrollElement.scrollTop;

    element = (scroll >= $('#bookmarkable_content').get(0).offsetTop) ? $('#bookmarkable_content') : $('#constitution_text_wrap')


    $('a.bm', element).each(function() {

        jParent = $(this).parent().parent();
        if (jParent.position().top + jParent.height() >= scroll) {
            save = jPrevious;
            return false;
        }
        jPrevious = $(this);
    });

    if (save && save.attr('name'))
    {
        save = save.attr('name');
    }
    else
    {
        save = 0;
    }


    today = new Date();
    today.setFullYear(today.getFullYear() + 1);

    document.cookie = 'topElement = ' + save + '; expires=' + today.toGMTString();
}

// Дополнительная функция возвращает значение cookie
function returnCookie(name) {
    var cookies = document.cookie;
    var position = cookies.indexOf(name);

    if (position > -1) {
        var start = position + name.length + 1;
        var end = cookies.indexOf(';', start);

        end = end > -1 ? end : cookies.length;

        var value = cookies.substring(start, end);
    }

    return value || false;
}

