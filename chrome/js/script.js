(function(){
var htmlElement = document.documentElement;
var modals = document.querySelectorAll('.modal');
var modalButtons = document.querySelectorAll('.modal-button');
var modalCloses = document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button');
var add = document.getElementById('add');
var addCurrent = document.getElementById('add-current');
var openAll = document.getElementById('open-all');
var openSelected = document.getElementById('open-selected');
var saveTitle = document.getElementById('save-title');

function validateUrl(url) {
  var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
  return match;
}

function getHostName(url) {
  return validateUrl(url)[2];
}

function getFavicon(domain) {
  return 'http://www.google.com/s2/favicons?domain=' + domain;
}

function openSite(url) {
  chrome.tabs.create({ url: url, selected: false });
}

function truncate(str, n) {
  if (str.length > n) {
    return str.substring(0, n) + '...';
  } else {
    return str;
  }
}

function uniqueUrl(sites, url) {
  for (var i = 0; i < sites.length; i++) {
    if (sites[i].url === url) {
      return false;
    }
  }
  return true;
}

if (modalCloses.length > 0) {
  modalCloses.forEach(function (el) {
    el.addEventListener('click', function () {
      closeModals();
    });
  });
}

function openModal(target) {
  var modal = document.querySelector(target);
  htmlElement.classList.add('is-clipped');
  modal.classList.add('is-active');
}

function closeModals() {
  htmlElement.classList.remove('is-clipped');
  modals.forEach(function (el) {
    el.classList.remove('is-active');
  });
}

function getSites() {
  var url, title, li, textHost, imgFavicon, btnRemove, btnRename, checkboxContainer, checkbox, checkmark;
  var dailySites = document.getElementById('daily-sites');
  dailySites.innerHTML = ''; //clear list
  chrome.storage.sync.get({ sites: [] }, function (result) {
    var sites = result.sites;
    for (var i = 0; i < sites.length; i++) {
      url = sites[i].url;
      title = truncate(sites[i].title, 50); //truncate title
      //create elements and set attributes
      li = document.createElement('li');
      li.dataset.url = url;
      textHost = document.createTextNode(title);
      imgFavicon = document.createElement('img');
      imgFavicon.src = sites[i].favicon;
      btnRemove = document.createElement('button');
      btnRemove.className = 'button is-danger is-small';//bulma classes
      btnRemove.title = 'Remove';
      btnRemove.innerHTML = '&#10006;';
      btnRename = document.createElement('button');
      btnRename.className = 'button is-small modal-button';//bulma classes
      btnRename.title = 'Rename';
      btnRename.innerHTML = '&#9998;';
      checkboxContainer = document.createElement('label');
      checkboxContainer.className = 'checkbox-container';
      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = "site";
      checkmark = document.createElement('span');
      checkmark.className = 'checkmark';
      //append elements
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(checkmark);

      li.appendChild(imgFavicon);
      li.appendChild(textHost);
      li.appendChild(checkboxContainer);
      li.appendChild(btnRemove);
      li.appendChild(btnRename);
      dailySites.appendChild(li);
      //add event listeners
      checkboxContainer.addEventListener('click', checkHandler, false);
      btnRemove.addEventListener('click', removeSiteHandler, false);
      btnRename.addEventListener('click', renameSiteHandler, false);
      li.addEventListener('click', openSiteHandler, false);
    }
  });
}

function checkHandler(e) {
  e.stopPropagation();
}

function openSiteHandler(e) {
  var url = e.target.dataset.url;
  openSite(url);
}

function removeSiteHandler(e) {
  e.stopPropagation();
  var li = e.target.parentNode;
  var url = li.dataset.url;
  chrome.storage.sync.get(function (result) {
    var sites = result.sites;
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].url === url) {
        sites.splice(i, 1);
      }
    }
    chrome.storage.sync.set({ sites: sites }, function () {
      getSites();
    });
  });
}

function renameSiteHandler(e) {
  e.stopPropagation();
  var li = e.target.parentNode;
  var url = li.dataset.url;
  var title = document.getElementById('title'); 
  title.value = li.childNodes[1].textContent;   
  title.dataset.url = url;
  openModal('.modal-rename');
}

function addSite(url) {
  fetch(url)
    .then(function (response) {
      return response.text();
    }).then(function (text) {
      chrome.storage.sync.get({ sites: [] }, function (result) {
        var sites = result.sites;
        if (!uniqueUrl(sites, url)) {
          openModal('.modal-alert');
          return;
        }
        var site = {};
        var match = text.match(/<title>(.*?)<\/title>/); //try to get the site title
        if (match) {
          site.title = match[1];
        } else {
          site.title = getHostName(url);
        }
        site.favicon = getFavicon(getHostName(url));
        site.url = url;
        sites.push(site);
        chrome.storage.sync.set({ sites: sites }, function () {
          getSites();
        });
      });
    });
}

  add.addEventListener('click', function () {
    var urlInput = document.getElementById('url');
    var url = urlInput.value;
    if (url == '' || !validateUrl(url)) return;
    addSite(url);
    urlInput.value = '';
  }, false);

  addCurrent.addEventListener('click', function () {
    chrome.tabs.query({ active: true }, function (tab) {
      var url = tab[0].url;
      addSite(url);
    });
  }, false);

  openAll.addEventListener('click', function () {
    chrome.storage.sync.get(function (result) {
      var sites = result.sites;
      for (var i = 0; i < sites.length; i++) {
        openSite(sites[i].url);
      }
    });
  }, false);

  saveTitle.addEventListener('click', function (e) {
    chrome.storage.sync.get(function (result) {
      var sites = result.sites;
      var title = document.getElementById('title'); 
      for (var i = 0; i < sites.length; i++) {
        if (sites[i].url === title.dataset.url) {
          sites[i].title = title.value;   
        }
      }
      chrome.storage.sync.set({ sites: sites }, function () {
        getSites();
      });
    });
  }, false);

  openSelected.addEventListener('click', function () {
    var openSelected = document.getElementsByName('site');
    var url;
    openSelected.forEach(function (item) {
      if (item.checked) {
        var li = item.parentNode.parentNode;
        url = li.dataset.url;
        openSite(url);
      }
    });

  }, false);

  getSites();
  
})();


  
