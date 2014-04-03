/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is BlueGriffon.
 *
 * The Initial Developer of the Original Code is
 * Disruptive Innovations SARL.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Daniel Glazman <daniel.glazman@disruptive-innovations.com>, Original author
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://gre/modules/InlineSpellChecker.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("resource://app/modules/urlHelper.jsm");
Components.utils.import("resource://app/modules/prompterHelper.jsm");
Components.utils.import("resource://app/modules/editorHelper.jsm");
Components.utils.import("resource://app/modules/cssHelper.jsm");
Components.utils.import("resource://app/modules/fileHelper.jsm");
Components.utils.import("resource://app/modules/l10nHelper.jsm");
Components.utils.import("resource://app/modules/handlersManager.jsm");
Components.utils.import("resource://app/modules/screens.jsm");
Components.utils.import("resource://app/modules/fileChanges.jsm");

const kHTML_TRANSITIONAL = "resource://app/res/html_transitional.html";
const kHTML_STRICT = "resource://app/res/html_strict.html";
const kXHTML_TRANSITIONAL = "resource://app/res/xhtml_transitional.xhtml";
const kXHTML_STRICT = "resource://app/res/xhtml_strict.xhtml";
const kHTML5 = "resource://app/res/html5.html";
const kXHTML5 = "resource://app/res/xhtml5.xhtml";
const kXHTML11 = "resource://app/res/xhtml11.xhtml";
const kPOLYGLOT = "resource://app/res/polyglot.xhtml";
//@line 52 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"

// implements nsIObserver
var gEditorDocumentObserver =
{ 
  observe: function(aSubject, aTopic, aData)
  {
    // Should we allow this even if NOT the focused editor?
    var commandManager = EditorUtils.getCurrentCommandManager();
    if (commandManager != aSubject)
      return;

    var editor = EditorUtils.getCurrentEditor();
    gContentWindow = window.content;
    switch(aTopic)
    {
      case "obs_documentCreated":
        // placeholder; TBD

        // TBD : 1. DONE
        //       2. add override stylesheets if needed
        //       3. call "load" notifier callbacks
        //       4. update window title
        //       5. place initial selection
        //       6. check DTD strictness

        // Get state to see if document creation succeeded
        var params = EditorUtils.newCommandParams();
        if (!params)
          return;

        try {
          var spellChecker = new InlineSpellChecker(editor);
          var prefs = Services.prefs;
          var enabled = prefs.getBoolPref("bluegriffon.spellCheck.enabled");
          spellChecker.enabled = enabled;
          EditorUtils.getCurrentEditorElement().setUserData("spellchecker", spellChecker, null);
        }
        catch(e) { }

        try {
          commandManager.getCommandState(aTopic, gContentWindow, params);
          var errorStringId = 0;
          var editorStatus = params.getLongValue("state_data");
          if (!editor && editorStatus == nsIEditingSession.eEditorOK)
          {
            editorStatus = nsIEditingSession.eEditorErrorUnknown;
          }

          switch (editorStatus)
          {
            case nsIEditingSession.eEditorErrorCantEditFramesets:
              errorStringId = "CantEditFramesetMsg";
              break;
            case nsIEditingSession.eEditorErrorCantEditMimeType:
              errorStringId = "CantEditMimeTypeMsg";
              break;
            case nsIEditingSession.eEditorErrorUnknown:
              errorStringId = "CantEditDocumentMsg";
              break;
            // Note that for "eEditorErrorFileNotFound, 
            // network code popped up an alert dialog, so we don't need to
          }
          if (errorStringId)
            PromptUtils.alertWithTitle("", L10NUtils.getString(errorStringId));
        } catch(e) {  }

        // We have a bad editor -- nsIEditingSession will rebuild an editor
        //   with a blank page, so simply abort here
        if (editorStatus)
          return; 

        window.content.focus();
        
        NotifierUtils.notify("documentCreated");
        break;

      case "cmd_setDocumentModified":
        gDialog.tabeditor.showCurrentTabAsModified(EditorUtils.isDocumentModified());    // || IsHTMLSourceChanged());

        // TBD : 1. update web navigation commands
        //       2. DONE

        break;

      case "obs_documentWillBeDestroyed":
        // placeholder; TBD
        break;

      case "obs_documentLocationChanged":
        // TBD : 1. update base URL
        break;

      case "cmd_bold":
        // Update all style items
        // cmd_bold is a proxy; see EditorSharedStartup (above) for details
        window.updateCommands("style");
        // update the undo/redo items too
        window.updateCommands("undo");
        // and finally the main toolbar
        window.updateCommands("navigation");
        break;
    }
  }
}

var ResizeEventNotifier = {
  startup: function ResizeEventNotifier_startup()
  {
    window.addEventListener("resize", this.onResizeEvent, false);
  },

  shutdown: function ResizeEventNotifier_shutdown()
  {
    window.removeEventListener("resize", this.onResizeEvent, false);
  },

  onResizeEvent: function ResizeEventNotifier_onResizeEvent(aEvent)
  {
    if (aEvent.target.document.location.href == "chrome://bluegriffon/content/xul/bluegriffon.xul")
      NotifierUtils.notify("resizeEvent");
  }
};

var EditorScrolledNotifier =  {
  startup: function EditorScrolledNotifier_startup()
  {
    var tabeditor = document.getElementById("tabeditor");
    tabeditor.addEventListener("scroll", this.onEditorScrolled, false);
  },

  shutdown: function EditorScrolledNotifier_shutdown()
  {
    var tabeditor = document.getElementById("tabeditor");
    tabeditor.removeEventListener("scroll", this.onEditorScrolled, false);
  },

  onEditorScrolled: function EditorScrolledNotifier_onEditorScrolled(aEvent)
  {
    NotifierUtils.notify("editorScrolled");
  }
};

var BlueGriffonPrefsObserver = {
  observe: function(subject, topic, prefName)
  {
    // verify that we're changing a button pref
    if (topic != "nsPref:changed")
      return;

    const kSTRUCTUREBAR_PREFS = "bluegriffon.structurebar";

    if (prefName == "bluegriffon.returnKey.createsParagraph") {
      var value = Services.prefs.getBoolPref("bluegriffon.returnKey.createsParagraph");
      var windowEnumerator = Services.wm.getEnumerator("bluegriffon");
      while (windowEnumerator.hasMoreElements()) {
        var w = windowEnumerator.getNext();
        var editors = w.gDialog.tabeditor.mTabpanels.childNodes;
        for (var i = 0; i < editors.length; i++) {
          try {
            var e = editors[i].lastChild;
            var innerEditor = e.getEditor(e.contentWindow);
            innerEditor.returnInParagraphCreatesNewParagraph = value;
          }
          catch(e) {}
        }
      }
    }

    else if (prefName == "bluegriffon.spellCheck.enabled") {
      var value = Services.prefs.getBoolPref("bluegriffon.spellCheck.enabled");
      var windowEnumerator = Services.wm.getEnumerator("bluegriffon");
      while (windowEnumerator.hasMoreElements()) {
        var w = windowEnumerator.getNext();
        var editors = w.gDialog.tabeditor.mTabpanels.childNodes;
        for (var i = 0; i < editors.length; i++) {
          try {
            var e = editors[i].lastChild;
            var innerEditor = e.getEditor(e.contentWindow);
            innerEditor.setSpellcheckUserOverride(value);
          }
          catch(e) {}
        }
      }
    }

    else if (prefName == "bluegriffon.tabs.position") {
      var value = Services.prefs.getCharPref("bluegriffon.tabs.position");
      var windowEnumerator = Services.wm.getEnumerator("bluegriffon");
      while (windowEnumerator.hasMoreElements()) {
        var w = windowEnumerator.getNext();
        var tabeditor = w.gDialog.tabeditor;
        tabeditor.setAttribute("tabmode", value);
      }
    }

    else if (prefName == "bluegriffon.source.theme") {
      var value = Services.prefs.getCharPref("bluegriffon.source.theme");
      var windowEnumerator = Services.wm.getEnumerator("bluegriffon");
      while (windowEnumerator.hasMoreElements()) {
        var w = windowEnumerator.getNext();
        var tabeditor = w.gDialog.tabeditor;
        var panels = tabeditor.mTabpanels;
        var decks = panels.childNodes;
        for (var i = 0; i < decks.length; i++) {
          decks[i].firstChild.contentWindow.useTheme(value);
        }
      }
    }
    else if (prefName == "bluegriffon.osx.dock-integration") {
      var value = Services.prefs.getBoolPref("bluegriffon.osx.dock-integration");
      if (value)
        UpdateBadge();
      else
        ResetBadge();
    }
    else if (prefName.substr(0, kSTRUCTUREBAR_PREFS.length) == kSTRUCTUREBAR_PREFS
             && gDialog.structurebar.mLastNode)
      gDialog.structurebar.selectionChanged(
                null,
                gDialog.structurebar.mLastNode,
                gDialog.structurebar.mOneElementSelected);
    else if (prefName == "bluegriffon.display.comments"
             || prefName == "bluegriffon.display.php"
             || prefName == "bluegriffon.display.pi") {
      var valueArray = [];
      if (!Services.prefs.getBoolPref("bluegriffon.display.comments"))
        valueArray.push("comment");
      if (!Services.prefs.getBoolPref("bluegriffon.display.php"))
        valueArray.push("php");
      if (!Services.prefs.getBoolPref("bluegriffon.display.pi"))
        valueArray.push("pi");
      var value = valueArray.join(" ");

      var windowEnumerator = Services.wm.getEnumerator("bluegriffon");
      while (windowEnumerator.hasMoreElements()) {
        var w = windowEnumerator.getNext();
        var editors = w.gDialog.tabeditor.mTabpanels.childNodes;
        for (var i = 0; i < editors.length; i++) {
          try {
            var e = editors[i].lastChild;
            var innerEditor = e.getEditor(e.contentWindow);
            innerEditor.document.documentElement.setAttribute("_moz_hide", value);
          }
          catch(e) {}
        }
      }
    }
  }
};


const nsIDCW = Components.interfaces.nsIDOMChromeWindow;
var gLastWindowState = -1;

function onSizeModeChange()
{
  var badger = Components.classes["@disruptive-innovations.com/osintegration/badger;1"]
                         .createInstance(Components.interfaces.diIOSIntegration);
  var wm = Services.wm;
  var hidden = wm.getMostRecentWindow("hidden-main");
  var enumerator = wm.getEnumerator( "" );
  switch (window.windowState) {
    case nsIDCW.STATE_MINIMIZED:
      {
        // minified
        gLastWindowState = window.windowState;
        while ( enumerator.hasMoreElements() )
        {
          var win = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
          if (win.opener
              && win.document.documentElement.id != "Bluegriffon"
              && (win.opener == window || win.opener.document.documentElement.id == "hidden-window")) {
            var baseWindow = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                                   .getInterface(Components.interfaces.nsIWebNavigation)
                                   .QueryInterface(Components.interfaces.nsIBaseWindow);
            badger.show(baseWindow, false);
          }
        }
      }
      break;
    default:
      if (gLastWindowState == nsIDCW.STATE_MINIMIZED) {
        // raised
        gLastWindowState = -1;
        while ( enumerator.hasMoreElements() )
        {
          var win = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
          if (win.opener
              && win.document.documentElement.id != "Bluegriffon"
              && (win.opener == window || win.opener.document.documentElement.id == "hidden-window")) {
            var baseWindow = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                                   .getInterface(Components.interfaces.nsIWebNavigation)
                                   .QueryInterface(Components.interfaces.nsIBaseWindow);
            badger.show(baseWindow, true);
          }
        }
      }
      break;
  }
}

//@line 54 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://app/modules/urlHelper.jsm");
Components.utils.import("resource://app/modules/editorHelper.jsm");
Components.utils.import("resource://app/modules/bgQuit.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource://gre/modules/fileChanges.jsm");

var gContentWindow = null;

function Startup()
{
  SetLocationDB();
  var url = null;
  // do we have a URL to open ?
  try {
    if (window.arguments && window.arguments[0]) {
      var cl = window.arguments[0];
      if (cl && cl instanceof Components.interfaces.nsISupportsArray) {
        url = cl.GetElementAt(0).QueryInterface(Components.interfaces.nsISupportsString).data;
        var localFile = UrlUtils.newLocalFile(url);
        var ioService =
          Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
        var fileHandler =
          ioService.getProtocolHandler("file")
                   .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
        url = fileHandler.getURLSpecFromFile(localFile);
      }
    }
    else if (window.arguments.length >= 2 &&
             window.arguments[1])
      url = window.arguments[1];
  }
  catch(e) { url = null; }

  GetUIElements();

  ComposerCommands.setupMainCommands();
  window.updateCommands("style");
  RestoreShortcuts();
  RestorePanels();

  InstallCustomizationDoneCallbacks();

  gDialog.structurebar.init();

  ResizeEventNotifier.startup();
  EditorScrolledNotifier.startup();
  BGZoomManager.startup();
  BGUpdateManager.check();
  
  initLocalFontFaceMenu(gDialog.FontFacePopup);

  try {
    var pbi = Services.prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("bluegriffon.", BlueGriffonPrefsObserver, false);
  } catch(ex) {
  }

  // let's finish with the url
  if (url)
    setTimeout(OpenFile, 100, url, true);

  setTimeout(LoadLastTabs, 1000);
  BlueGriffonQuitHelper.init();

  if (document.getElementById("tipoftheday"))
    document.getElementById("tipoftheday").launch(null);

  AddonManager.getAddonByID("{f13b157f-b174-47e7-a34d-4815ddfdfeb8}",
    function(addon) { if(addon) document.getElementById("venkmanMenuitem").hidden = false; } );

  AddonManager.getAddonByID("inspector@mozilla.org",
    function(addon) { if(addon) document.getElementById("menu_inspector").hidden = false; } );

  NotifierUtils.addNotifierCallback("selection_strict", BlueGriffon_lookForFileChanges, this);

  window.addEventListener("sizemodechange", onSizeModeChange, false);
}

var gLookingForFileChangesTimeout = null;

function BlueGriffon_lookForFileChanges() {
  if (gLookingForFileChangesTimeout)
    clearTimeout(gLookingForFileChangesTimeout);

  gLookingForFileChangesTimeout = setTimeout(function() { FileChangeUtils.lookForChanges(); }, 500);
}

var gLastTabsArray;
function LoadLastTabs()
{
  var lastTabs = "";
  gLastTabsArray = [];
  try {
    lastTabs = Services.prefs.getCharPref("bluegriffon.defaults.lastTabs");
    Services.prefs.setCharPref("bluegriffon.defaults.lastTabs", "");
  }
  catch(e) {}
  if (lastTabs) {
    gLastTabsArray = lastTabs.split("|");
    //gLastTabsArray.reverse();
    NotifierUtils.addNotifierCallback("tabCreated", OpenTabFromPreviousSession);
    var url = gLastTabsArray.pop();
    OpenFile(url, true);
  }
}

function OpenTabFromPreviousSession(aReason, aContext)
{
  if (gLastTabsArray.length) {
    var url = gLastTabsArray.pop();
    OpenFile(url, true);
  }
  else {
    NotifierUtils.removeNotifierCallback("tabCreated", OpenTabFromPreviousSession);
  }
}

function RestoreShortcuts()
{
  try {
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties)
                         .get("ProfD", Components.interfaces.nsIFile);
    file.append("shortcuts.sqlite");
    
    var storageService = Components.classes["@mozilla.org/storage/service;1"]
                            .getService(Components.interfaces.mozIStorageService);
    var dbConn = storageService.openDatabase(file);

    var statement = dbConn.createStatement("SELECT * from shortcuts");

    // remove all existing shortcuts...
    var elts = document.querySelectorAll("#composer-main-menubar *[key], toolbar *[key]");
    for (var i = 0; i < elts.length; i++) {
      var elt = elts[i];
      var keyId = elt.getAttribute("key");
      elt.removeAttribute("key");
      var keyElt = document.getElementById(keyId);
      if (keyElt) { //sanity check
        var keyset = keyElt.parentNode;
        keyset.removeChild(keyElt);
        var parent = keyset.parentNode;
        var nextSibling = parent.nextSibling;
        parent.removeChild(keyset);
        parent.insertBefore(keyset, nextSibling);
       }
    }

    while (statement.executeStep()) {
      var selector = statement.getUTF8String(1);
      var modifiers = statement.getUTF8String(2);
      var key = statement.getUTF8String(3);

      var elt = document.querySelector(selector);
      // recreate a key
      var keyset = document.getElementById("mainKeySet");
      keyElt = document.createElement("key");
      keyElt.setAttribute("modifiers", modifiers);
      if (key.length == 1)
        keyElt.setAttribute("key", key);
      else
        keyElt.setAttribute("keycode", key);
      if (elt.hasAttribute("command"))
        keyElt.setAttribute("command", elt.getAttribute("command"));
      if (elt.hasAttribute("oncommand"))
        keyElt.setAttribute("oncommand", elt.getAttribute("oncommand"));
      if (!elt.hasAttribute("command") && !elt.hasAttribute("oncommand")) {
        var cmdStr = 'var e = document.createEvent("Events"); e.initEvent("command", true, true); document.querySelector("'
                     + selector
                     +'").dispatchEvent(e);';
        keyElt.setAttribute("oncommand", cmdStr);
      }

      var keyId =  "key-" + modifiers.replace( /,/g , "-") + key;
      keyElt.setAttribute("id", keyId);
      keyset.appendChild(keyElt);
      elt.setAttribute("key", keyId);

      var parent = keyset.parentNode;
      var nextSibling = parent.nextSibling;
      parent.removeChild(keyset);
      parent.insertBefore(keyset, nextSibling);
    }
    dbConn.close();
  }
  catch(e) {
    // no shortcut DB yet, do nothing
  }
}

function RestorePanels()
{
  var items = document.querySelectorAll("#panelsMenuPopup > menuitem[panel]");
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var panelid = item.getAttribute("panel");
    var panel = document.getElementById(panelid);
    //var s = ""; for (var k = 0; k < item.attributes.length; k++) s+= item.attributes.item(k).nodeName + "=" + item.attributes.item(k).nodeValue + "\n"; alert(s);
    if (item.getAttribute("checked") == "true") {
      if (panel) {
        if (item.getAttribute("decked") == "true") {
          gDialog.deckedPanelsTabs.addPanel(item.getAttribute("label"),
                                            item.getAttribute("url"),
                                            panelid);
        }
        else {
          panel.firstElementChild.setAttribute("src", item.getAttribute("url"));
        }
  	  }
  	  else { // linux case :(
        if (item.getAttribute("decked") == "true") {
          gDialog.deckedPanelsTabs.addPanel(item.getAttribute("label"),
                                            item.getAttribute("url"),
                                            panelid);
        }
        else {
          window.open(item.getAttribute("url"),"_blank",
                     "chrome,resizable,scrollbars=yes");
        }
      }
    }
  }
}
//@line 56 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"

function Shutdown()
{
  NotifierUtils.removeNotifierCallback("selection_strict", BlueGriffon_lookForFileChanges, this);

  try {
    var pbi = Services.prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("bluegriffon.", BlueGriffonPrefsObserver, false);
  } catch(ex) {
  }

  gDialog.structurebar.shutdown();
  ResizeEventNotifier.shutdown();
  EditorScrolledNotifier.shutdown();
  BGZoomManager.shutdown();

  // persist floating panels' position
  var panels = document.querySelectorAll('panel[floating="true"]');
  for (var i = 0; i < panels.length; i++) {
    if (panels[i].popupBoxObject.popupState == "open") {
      panels[i].persistPosition();
      panels[i].setAttribute("open", "true");
      document.persist(panels[i].id, "open");
    }
    else {
      panels[i].setAttribute("open", "false");
      document.persist(panels[i].id, "open");
    }
  }
}

function onClose()
{
  SaveTabs();
  if (doSaveTabsBeforeQuit()) {
    Shutdown();
    return true;
  }
  return false;
}//@line 58 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"

//@line 66 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"
var gSYSTEM = "WINDOWS";
//@line 68 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"

function OpenLocation(aEvent, type)
{
  window.openDialog("chrome://bluegriffon/content/dialogs/openLocation.xul","_blank",
              "chrome,modal,titlebar", type);
  if (aEvent) aEvent.stopPropagation();
}

function OpenNewWindow(aURL)
{
  // warning, the first argument MUST be null here because when the
  // first window is created, it gets the cmdLine as an argument
  window.delayedOpenWindow("chrome://bluegriffon/content/xul/bluegriffon.xul", "chrome,all,dialog=no", null, aURL);
}

function GetPreferredNewDocumentURL()
{
  var url = window["kHTML_TRANSITIONAL"];
  try {
    urlId = Services.prefs.getCharPref("bluegriffon.defaults.doctype");
    url = window[urlId]; 
  }
  catch(e) {}
  return url;
}

function NewDocument(aEvent)
{
  var url = GetPreferredNewDocumentURL();

  OpenFile(url, true);
  if (aEvent) aEvent.stopPropagation();
}

function NewDocumentInNewWindow(aEvent)
{
  var url = GetPreferredNewDocumentURL();

  OpenFile(url, false);
  if (aEvent) aEvent.stopPropagation();
}

function NewDocumentWithOptions(aEvent)
{
  var rv = {value: "", where:"tab"};
  window.openDialog("chrome://bluegriffon/content/dialogs/newDocument.xul","_blank",
              "chrome,modal,titlebar", rv);
  if (aEvent) aEvent.stopPropagation();
}

function OpenFile(aURL, aInTab)
{
  // early way out if no URL
  if (!aURL)
    return;
 
  var alreadyEdited = EditorUtils.isAlreadyEdited(aURL);
  if (alreadyEdited)
  {
    var win    = alreadyEdited.window;
    var editor = alreadyEdited.editor;
    var index  = alreadyEdited.index;
    win.document.getElementById("tabeditor").selectedIndex = index;
    win.document.getElementById("tabeditor").mTabpanels.selectedPanel = editor;

    // nothing else to do here...
    win.focus();
    return;
  }

  // force new window if we don't have one already
  var tabeditor = document.getElementById("tabeditor");
  if (tabeditor && aInTab) {
    document.getElementById("tabeditor").addEditor(
         UrlUtils.stripUsernamePassword(aURL, null, null),
         aURL);
    gDialog.structurebar.removeAttribute("class");
  }
  else
    OpenNewWindow(aURL);
}

function EditorLoadUrl(aElt, aURL)
{
  try {
    if (aURL)
    {
      var Ci = Components.interfaces;
      var url = UrlUtils.normalizeURL(aURL);

      aElt.webNavigation.loadURI(url, // uri string
             Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,     // load flags
             null,                                         // referrer
             null,                                         // post-data stream
             null);
    }
  } catch (e) { }
}

function AboutComposer()
{
  var wm = Services.wm;
  var enumerator = wm.getEnumerator( "BlueGriffon:About" );
  while ( enumerator.hasMoreElements() )
  {
    var win = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
    win.focus();
    return;
  }
  window.open('chrome://bluegriffon/content/dialogs/aboutDialog.xul',"_blank",
              "chrome,resizable,scrollbars=yes");
}

function OpenConsole()
{
  window.open("chrome://global/content/console.xul","_blank",
              "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar");
}

function OpenExtensionsManager()
{
  window.openDialog("chrome://mozapps/content/extensions/extensions.xul",
                    "",
                    "chrome,dialog=no,resizable");
}

function StopLoadingPage()
{
  gDialog.tabeditor.stopWebNavigation();
}

//--------------------------------------------------------------------
function onButtonUpdate(button, commmandID)
{
  var commandNode = gDialog[commmandID];
  var state = commandNode.getAttribute("state");
  button.checked = state == "true";
}

function UpdateWindowTitle(aEditorElement)
{
  if (!aEditorElement) {
    aEditorElement = EditorUtils.getCurrentEditorElement();
    if (!aEditorElement) // sanity check
      return "";
  }

  try {
    var doc = aEditorElement.contentDocument;
    var windowTitle = doc.title;
    if (!windowTitle)
      windowTitle = L10NUtils.getString("untitled");

    // Append just the 'leaf' filename to the Doc. Title for the window caption
    var docUrl = doc.QueryInterface(Components.interfaces.nsIDOMHTMLDocument).URL;
    if (docUrl && !UrlUtils.isUrlOfBlankDocument(docUrl))
    {
      var scheme = UrlUtils.getScheme(docUrl);
      var filename = UrlUtils.getFilename(docUrl);
      if (filename)
        windowTitle += " [" + scheme + ":/.../" + decodeURI(filename) + "]";

      // TODO: 1. Save changed title in the recent pages data in prefs
    }

    // Set window title with
    var titleModifier = L10NUtils.getString("titleModifier");
    document.title    = L10NUtils.getBundle()
                                 .formatStringFromName("titleFormat",
                                                       [windowTitle, titleModifier],
                                                       2);
    return windowTitle;                                                       
  } catch (e) { }
  return "";
}

function ApplyDirectTextColorChange(aColor)
{
    var editor = EditorUtils.getCurrentEditor();
    var isCSSEnabled = editor.isCSSEnabled;
    editor.isCSSEnabled = true;
    editor.setInlineProperty('font', 'color', aColor)
    editor.isCSSEnabled = isCSSEnabled;
}

function ApplyDirectBackgroundColorChange(aColor)
{
    var editor = EditorUtils.getCurrentEditor();
    var isCSSEnabled = editor.isCSSEnabled;
    editor.isCSSEnabled = true;
    editor.setBackgroundColor(aColor)
    editor.isCSSEnabled = isCSSEnabled;
}

function onParagraphFormatChange(paraMenuList, commandID)
{
  if (!paraMenuList)
    return;

  var commandNode = gDialog[commandID];
  var state = commandNode.getAttribute("state");

  // force match with "normal"
  if (state == "body")
    state = "";

  if (state == "mixed") {
    //Selection is the "mixed" ( > 1 style) state
    paraMenuList.selectedItem = null;
    //paraMenuList.setAttribute("label","--");
    paraMenuList.setAttribute("label", "mixed");
  }
  else
  {
    var menuPopup = gDialog.ParagraphPopup;
    var menuItems = menuPopup.childNodes;
    for (var i=0; i < menuItems.length; i++)
    {
      var menuItem = menuItems.item(i);
      if ("value" in menuItem && menuItem.value == state)
      {
        paraMenuList.selectedItem = menuItem;
        break;
      }
    }
  }
}

function onARIARoleChange(menuList, commandID)
{
  var commandNode = document.getElementById(commandID);
  var state = commandNode.getAttribute("state");
  menuList.value = state;
}

function onARIARoleChangeStructureBar(commandID)
{
  var commandNode = document.getElementById(commandID);
  var state = commandNode.getAttribute("state");
  var popup = gDialog.ARIARoleStructureBarPopup;
  var child = popup.firstElementChild;
  while (child) {
    if (child.getAttribute("value") == state)
      child.setAttribute("checked", "true");
    else
      child.removeAttribute("checked");
    child = child.nextElementSibling;
  }
}

/************* GLOBAL VARS *************/

/************* Encapsulation menu ******/

function initEncapsulateMenu(menuPopup)
{
  deleteAllChildren(menuPopup);

  var elts = HTML5Helper.mHTML5_ELEMENTS;
  for (var i = 0; i < elts.length; i++) {
    var e = elts[i];
    if (!e.block && !e.empty) {
      var label = e.label;
      try {
        var str = gDialog.bundleHTML5.getString(label);
        label = str;
      }
      catch(e) {}
      var item = document.createElement("menuitem");
      item.setAttribute("label", label);
      item.setAttribute("html5index", i);
      item.setAttribute("oncommand", "Encapsulate(event, this)")
      menuPopup.appendChild(item);
    }
  }
}

function Encapsulate(event, aItem)
{
  event.stopPropagation();
  var elt;
  if (aItem.hasAttribute("html5index")) {
    var index = parseInt(aItem.getAttribute("html5index"));
    elt = HTML5Helper.mHTML5_ELEMENTS[index];
  }
  else {
    elt = { tag:  aItem.getAttribute("tag") };
  }
  EditorUtils.getCurrentEditor().setInlineProperty(elt.tag, "", "");
}
/************* FONT FACE ****************/

function initFontFaceMenu(menuPopup)
{
  //initLocalFontFaceMenu(menuPopup);

  if (menuPopup)
  {
    var children = menuPopup.childNodes;
    if (!children) return;

    var firstHas = { value: false };
    var anyHas = { value: false };
    var allHas = { value: false };

    // we need to set or clear the checkmark for each menu item since the selection
    // may be in a new location from where it was when the menu was previously opened

    // Fixed width (second menu item) is special case: old TT ("teletype") attribute
    EditorUtils.getTextProperty("tt", "", "", firstHas, anyHas, allHas);
    children[1].setAttribute("checked", allHas.value);

    if (!anyHas.value)
      EditorUtils.getTextProperty("font", "face", "", firstHas, anyHas, allHas);

    children[0].setAttribute("checked", !anyHas.value);

    // Skip over default, TT, and separator
    for (var i = 3; i < children.length; i++)
    {
      var menuItem = children[i];
      var faceType = menuItem.getAttribute("value");

      if (faceType)
      {
        EditorUtils.getTextProperty("font", "face", faceType, firstHas, anyHas, allHas);

        // Check the menuitem only if all of selection has the face
        if (allHas.value)
        {
          menuItem.setAttribute("checked", "true");
          break;
        }

        // in case none match, make sure we've cleared the checkmark
        menuItem.removeAttribute("checked");
      }
    }
  }
}

const kFixedFontFaceMenuItems = 7; // number of fixed font face menuitems

function initLocalFontFaceMenu(menuPopup)
{
  // fill in the menu only once...
  var callingId = menuPopup.parentNode.id;

  if(!BlueGriffonVars.fontMenuOk)
    BlueGriffonVars.fontMenuOk = {};
  if (BlueGriffonVars.fontMenuOk[callingId ] &&
      menuPopup.childNodes.length != kFixedFontFaceMenuItems)
    return;
  BlueGriffonVars.fontMenuOk[callingId ] = callingId ;

  if (!BlueGriffonVars.localFonts)
  {
    // Build list of all local fonts once per editor
    try 
    {
      var enumerator = Components.classes["@mozilla.org/gfx/fontenumerator;1"]
                                 .getService(Components.interfaces.nsIFontEnumerator);
      var localFontCount = { value: 0 }
      BlueGriffonVars.localFonts = enumerator.EnumerateAllFonts(localFontCount);
    }
    catch(e) { }
  }
  
  var useRadioMenuitems = (menuPopup.parentNode.localName == "menu"); // don't do this for menulists  
  if (menuPopup.childNodes.length == kFixedFontFaceMenuItems) 
  {
    if (BlueGriffonVars.localFonts.length == 0) {
      menuPopup.childNodes[kFixedFontFaceMenuItems - 1].hidden = true;
    }
    for (var i = 0; i < BlueGriffonVars.localFonts.length; ++i)
    {
      if (BlueGriffonVars.localFonts[i] != "")
      {
        var itemNode = document.createElementNS(BlueGriffonVars.kXUL_NS, "menuitem");
        itemNode.setAttribute("class", "menuitem-non-iconic-accel");
        itemNode.setAttribute("label", BlueGriffonVars.localFonts[i]);
        itemNode.setAttribute("value", BlueGriffonVars.localFonts[i]);
        if (useRadioMenuitems) {
          itemNode.setAttribute("type", "radio");
          itemNode.setAttribute("name", "2");
          itemNode.setAttribute("observes", "cmd_renderedHTMLEnabler");
        }
        menuPopup.appendChild(itemNode);
      }
    }
  }
}

function onFontFaceChange(fontFaceMenuList, commandID)
{
  var commandNode = document.getElementById(commandID);
  var state = commandNode.getAttribute("state");

  if (state == "mixed")
  {
    //Selection is the "mixed" ( > 1 style) state
    fontFaceMenuList.selectedItem = null;
    fontFaceMenuList.setAttribute("label","--");
  }
  else
  {
    var menuPopup = fontFaceMenuList.menupopup;
    var menuItems = menuPopup.childNodes;
    for (var i=0; i < menuItems.length; i++)
    {
      var menuItem = menuItems.item(i);
      if (menuItem.getAttribute("label") && ("value" in menuItem && menuItem.value.toLowerCase() == state.toLowerCase()))
      {
        fontFaceMenuList.selectedItem = menuItem;
        break;
      }
    }
  }
}

/************** CLASS MANAGEMENT **************/

function onClassChange(classMenuList, commandID)
{
  var commandNode = document.getElementById(commandID);
  var state = commandNode.getAttribute("state");
  classMenuList.value = state;
}

var gChangingClass = false;
function OnKeyPressInClassMenulist(aEvent)
{
  gChangingClass = true;
  var keyCode = aEvent.keyCode;
  if (keyCode == 13) {
    gDialog.ClassSelect.blur();
  }  
}

function OnBlurFromClassMenulist(aEvent)
{
  if (gChangingClass) {
    gChangingClass = false;
    var node = EditorUtils.getSelectionContainer().node;
    var className = gDialog.ClassSelect.value;
    if (className)
      EditorUtils.getCurrentEditor().setAttribute(node, "class", className);
    else
      EditorUtils.getCurrentEditor().removeAttribute(node, "class");
    // be kind with the rest of the world
    NotifierUtils.notify("selection_strict", node, true);
  }  
}

/************** ID MANAGEMENT **************/

function onIdChange(idMenuList, commandID)
{
  var commandNode = document.getElementById(commandID);
  var state = commandNode.getAttribute("state");
  idMenuList.value = state;
}

var gChangingId = false;
function OnKeyPressInIdMenulist(aEvent)
{
  gChangingId = true;
  var keyCode = aEvent.keyCode;
  if (keyCode == 13) {
    gDialog.IdSelect.blur();
  }  
}

function OnBlurFromIdMenulist(aEvent)
{
  if (gChangingId) {
    gChangingId = false;
    var node = EditorUtils.getSelectionContainer().node;
    var id = gDialog.IdSelect.value;
    if (id)
      EditorUtils.getCurrentEditor().setAttribute(node, "id", id);
    else
      EditorUtils.getCurrentEditor().removeAttribute(node, "id");
    // be kind with the rest of the world
    NotifierUtils.notify("selection_strict", node, true);
  }  
}

/************** STRUCTUREBAR *************/

function UpdateStructureBarContextMenu()
{
  var popupNode = document.popupNode;
  var target    = null;
  if (popupNode)
    target = popupNode.getUserData("node");
  if (target) // sanity check
    try {
      EditorUtils.getCurrentEditor().selectElement(target);
    }
    catch(e) {}

  if (target && target.hasAttribute("lang"))
    gDialog.resetElementLanguageMenuitem.removeAttribute("disabled");
  else
    gDialog.resetElementLanguageMenuitem.setAttribute("disabled", "true");

  if (target && target == target.ownerDocument.body)
  {
    gDialog.deleteElementMenuitem.setAttribute("disabled", "true");
    gDialog.removeTagMenuitem.setAttribute("disabled", "true");
    gDialog.changeTagMenuitem.setAttribute("disabled", "true");
  }
  else
  {
    gDialog.deleteElementMenuitem.removeAttribute("disabled");
    gDialog.removeTagMenuitem.removeAttribute("disabled");
    gDialog.changeTagMenuitem.removeAttribute("disabled");
  }
}

function ResetLanguage(aEvent)
{
  var popupNode = document.popupNode;
  if (popupNode)
  {
    var target = popupNode.getUserData("node");
    if (target)
    {
      var editor = EditorUtils.getCurrentEditor();
      editor.removeAttribute(target, "lang");
    }
  }
}

function ShowLanguageDialog(aEvent)
{
  var popupNode = document.popupNode;
  if (popupNode)
  {
    var target = popupNode.getUserData("node");
    if (target)
      window.openDialog("chrome://bluegriffon/content/dialogs/languages.xul","_blank",
                        "chrome,modal,titlebar,resizable", target);
  }
}

function UpdateDirectionMenu(aEvent)
{
  var popupNode = document.popupNode;
  if (popupNode)
  {
    var target = popupNode.getUserData("node");
    if (target) {
      var direction = target.style.direction;
      switch (direction) {
        case "ltr":
          gDialog.noDirectionContextMenuitem.removeAttribute("checked");
          gDialog.ltrDirectionContextMenuitem.setAttribute("checked", "true");
          gDialog.rtlDirectionContextMenuitem.removeAttribute("checked");
          break;
        case "rtl":
          gDialog.noDirectionContextMenuitem.removeAttribute("checked");
          gDialog.ltrDirectionContextMenuitem.removeAttribute("checked");
          gDialog.rtlDirectionContextMenuitem.setAttribute("checked", "true");
          break;
        default:
          gDialog.noDirectionContextMenuitem.setAttribute("checked", "true");
          gDialog.ltrDirectionContextMenuitem.removeAttribute("checked");
          gDialog.rtlDirectionContextMenuitem.removeAttribute("checked");
          break;
      }
    }
  }
}

function SetDirection(aEvent)
{
  var value = aEvent.originalTarget.getAttribute("value");
  var popupNode = document.popupNode;
  if (popupNode)
  {
    var target = popupNode.getUserData("node");
    if (target) {
      var txn = new diStyleAttrChangeTxn(target, "direction", value, "");
      EditorUtils.getCurrentEditor().transactionManager.doTransaction(txn);
      EditorUtils.getCurrentEditor().incrementModificationCount(1);  
    }
  }
}

function DeleteElement(aEvent)
{
  var popupNode = document.popupNode;
  if (popupNode)
  {
    var target = popupNode.getUserData("node");
    if (target)
    {
      var editor = EditorUtils.getCurrentEditor();
      editor.deleteNode(target);
    }
  }
}

function ExplodeElement(aEvent)
{
  var popupNode = document.popupNode;
  if (popupNode)
  {
    var target = popupNode.getUserData("node");
    if (target)
    {
      var editor = EditorUtils.getCurrentEditor();
      var parent = target.parentNode;
      editor.beginTransaction();

      var child = target.firstChild;
      while (child) {
        var tmp = child.nextSibling;
        var clone = child.cloneNode(true)
        var txn = new diNodeInsertionTxn(clone, parent, target);
        editor.transactionManager.doTransaction(txn);

        child = tmp;
      }
      editor.deleteNode(target);

      editor.endTransaction();
    }
  }
}

function ChangeTag(aEvent)
{
  var popupNode = gDialog.structurebar.querySelector("[checked='true']");
  var textbox = document.createElement("textbox");
  textbox.setAttribute("value", popupNode.getAttribute("value"));
  textbox.setAttribute("width", popupNode.boxObject.width);
  textbox.className = "struct-textbox";

  var target = popupNode.getUserData("node");
  textbox.setUserData("node", target, null);
  popupNode.parentNode.replaceChild(textbox, popupNode);

  textbox.addEventListener("keypress", OnKeyPressWhileChangingTag, false);
  textbox.addEventListener("blur", ResetStructToolbar, true);

  textbox.select();
}

function ResetStructToolbar(event)
{
  var editor = EditorUtils.getCurrentEditor();
  var textbox = event.target;
  var element = textbox.getUserData("node");
  textbox.parentNode.removeChild(textbox);
  editor.selectElement(element);
}

function OnKeyPressWhileChangingTag(event)
{
  var editor = EditorUtils.getCurrentEditor();
  var textbox = event.target;

  var keyCode = event.keyCode;
  if (keyCode == 13) {
    var newTag = textbox.value;
    var element = textbox.getUserData("node");
    textbox.parentNode.removeChild(textbox);

    if (newTag.toLowerCase() == element.nodeName.toLowerCase())
    {
      // nothing to do
      window.content.focus();
      return;
    }

    var offset = 0;
    var childNodes = element.parentNode.childNodes;
    while (childNodes.item(offset) != element) {
      offset++;
    }

    editor.beginTransaction();

    try {
      var newElt = editor.document.createElement(newTag);
      if (newElt) {
        childNodes = element.childNodes;
        var childNodesLength = childNodes.length;
        var i;
        for (i = 0; i < childNodesLength; i++) {
          var clone = childNodes.item(i).cloneNode(true);
          newElt.appendChild(clone);
        }
        editor.insertNode(newElt, element.parentNode, offset+1);
        editor.deleteNode(element);
        editor.selectElement(newElt);

        window.content.focus();
      }
    }
    catch (e) {}

    editor.endTransaction();

  }
  else if (keyCode == 27) {
    // if the user hits Escape, we discard the changes
    window.content.focus();
  }
}

/************ VIEW MODE ********/
function GetCurrentViewMode()
{
  return EditorUtils.getCurrentEditorElement().parentNode.getAttribute("currentmode") ||
         "wysiwyg";
}

function onSourceChangeCallback(source)
{
  var doctype = EditorUtils.getCurrentDocument().doctype;
  var systemId = doctype ? doctype.systemId : null;
  var isXML = false;
  switch (systemId) {
    case "http://www.w3.org/TR/html4/strict.dtd": // HTML 4
    case "http://www.w3.org/TR/html4/loose.dtd":
    case "http://www.w3.org/TR/REC-html40/strict.dtd":
    case "http://www.w3.org/TR/REC-html40/loose.dtd":
      isXML = false;
      break;
    case "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd": // XHTML 1
    case "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd":
    case "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd":
      isXML = true;
      break;
    case "":
      isXML = (EditorUtils.getCurrentDocument().documentElement.getAttribute("xmlns") == "http://www.w3.org/1999/xhtml");
      break;
    case null:
      isXML = (EditorUtils.getCurrentDocument().compatMode == "CSS1Compat");
      break;
  }

  var editorElement  = EditorUtils.getCurrentEditorElement();
  var sourceIframe   = editorElement.previousSibling;
  var sourceEditor   = sourceIframe.contentWindow.wrappedJSObject.gEditor;
  var sourceDocument = sourceIframe.contentWindow.document;

  if (isXML) {
    if (sourceEditor.lastErrorLine) {
      var lineInfo = sourceEditor.lineInfo(sourceEditor.lastErrorLine - 1);
      var markerClass = lineInfo.markerClass ? lineInfo.markerClass : "";
      var markerClassArray = markerClass.split(" ");
      markerClassArray.splice(markerClassArray.indexOf("error"), 1);
      sourceEditor.setMarker(sourceEditor.lastErrorLine - 1, null, markerClassArray.join(" "));
      sourceEditor.lastErrorLine = 0;
    }
    var xmlParser = new DOMParser();
    try {
      var doc = xmlParser.parseFromString(source, "text/xml");
      if (doc.documentElement.nodeName == "parsererror") {
        var message = doc.documentElement.firstChild.data.
          replace( /Location\: chrome\:\/\/bluegriffon\/content\/xul\/bluegriffon.xul/g , ", ");
        var error = doc.documentElement.lastChild.textContent;
        var line = parseInt(doc.documentElement.getAttribute("line"));
        var lineInfo = sourceEditor.lineInfo(line - 1);
        var markerClass = lineInfo.markerClass ? lineInfo.markerClass : "";
        var markerClassArray = markerClass.split(" ");
        if (-1 == markerClassArray.indexOf("error"))
          markerClassArray.push("error");
        sourceEditor.setMarker(line - 1, null, markerClassArray.join(" "));
        sourceEditor.lastErrorLine = line;

        return;
      }
    }
    catch(e) {alert(e)}
  }
}

function ToggleViewMode(aElement)
{
  if (!aElement) // sanity case
    return false;

  var editor = EditorUtils.getCurrentEditor();
  if (aElement.id == "wysiwygModeButton")
    editor.setMedium("screen");
  else if (aElement.id == "printPreviewModeButton")
    editor.setMedium("print");

  var mode =  aElement.getAttribute("mode");
  if (mode == GetCurrentViewMode())
    return true;

  var child = aElement.parentNode.firstChild;
  while (child) {
    if (child == aElement)
      child.setAttribute("selected", "true");
    else
      child.removeAttribute("selected");
    child = child.nextSibling;
  }

  var editor = EditorUtils.getCurrentEditor();
  var editorElement = EditorUtils.getCurrentEditorElement();
  editorElement.parentNode.setAttribute("currentmode", mode);

  gDialog.bespinToolbox1.hidden = true;
  gDialog.bespinToolbox2.hidden = true;

  var doctype = EditorUtils.getCurrentDocument().doctype;
  var systemId = doctype ? doctype.systemId : null;
  var isXML = false;
  switch (systemId) {
    case "http://www.w3.org/TR/html4/strict.dtd": // HTML 4
    case "http://www.w3.org/TR/html4/loose.dtd":
    case "http://www.w3.org/TR/REC-html40/strict.dtd":
    case "http://www.w3.org/TR/REC-html40/loose.dtd":
      isXML = false;
      break;
    case "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd": // XHTML 1
    case "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd":
    case "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd":
      isXML = true;
      break;
    case "":
      isXML = (EditorUtils.getCurrentDocument().documentElement.getAttribute("xmlns") == "http://www.w3.org/1999/xhtml");
      break;
    case null:
      isXML = (EditorUtils.getCurrentDocument().compatMode == "CSS1Compat");
      break;
  }

  if (mode == "source")
  {
    gDialog.structurebar.style.visibility = "hidden";
    HandlersManager.hideAllHandlers();
    gDialog.tabeditor.enableRulers(false);

    EditorUtils.cleanup();

    var mimeType = EditorUtils.getCurrentDocumentMimeType();
    const nsIDE = Components.interfaces.nsIDocumentEncoder;
    var encoder = Components.classes["@mozilla.org/layout/documentEncoder;1?type=" + mimeType]
                   .createInstance(nsIDE);

    var flags = EditorUtils.getSerializationFlags(EditorUtils.getCurrentDocument());

    encoder.setCharset(editor.documentCharacterSet);
    encoder.init(EditorUtils.getCurrentDocument(), mimeType, flags.value);
    if (flags.value & nsIDE.OutputWrap)
      encoder.setWrapColumn(flags.maxColumnPref);

    NotifierUtils.notify("beforeEnteringSourceMode");
    var source = encoder.encodeToString();
    var sourceIframe = editorElement.previousSibling;
    var sourceEditor = sourceIframe.contentWindow.wrappedJSObject.gEditor;
    sourceIframe.contentWindow.wrappedJSObject.gChangeCallback = onSourceChangeCallback;

    var theme = null;
    try {
      theme = GetPrefs().getCharPref("bluegriffon.source.theme");
    }
    catch(e) {}
    sourceIframe.contentWindow.wrappedJSObject.installCodeMirror(BespinKeyPressCallback,
                                                 BespinChangeCallback,
                                                 BespinActivityCallback,
                                                 theme,
                                                 null,
                                                 EditorUtils);

    var lastEditableChild = editor.document.body.lastChild;
    if (lastEditableChild.nodeType == Node.TEXT_NODE)
      lastEditableChild.data = lastEditableChild.data.replace( /\s*$/, "\n");

    MarkSelection();
    source = encoder.encodeToString();

    UnmarkSelection();

    sourceEditor.setValue(source.replace( /\r\n/g, "\n").replace( /\r/g, "\n"));
    /*if (flags.value & nsIDE.OutputWrap) {
      sourceEditor.setShowPrintMargin(true);
      sourceEditor.setPrintMarginColumn(flags.maxColumnPref);
    }
    else {
      sourceEditor.setShowPrintMargin(false);
    }*/
    NotifierUtils.notify("afterEnteringSourceMode");
    editorElement.parentNode.selectedIndex = 0;

    sourceIframe.focus();
    sourceEditor.refresh();
    sourceEditor.focus();
    sourceIframe.contentWindow.wrappedJSObject.markSelection();
    sourceIframe.setUserData("oldSource", sourceEditor.getValue(), null);
    sourceIframe.setUserData("lastSaved", "", null);

    sourceIframe.contentWindow.wrappedJSObject.isXML = isXML;
    EditorUtils.getCurrentSourceWindow().ResetModificationCount();
  }
  else if (mode == "wysiwyg")
  {
    // Reduce the undo count so we don't use too much memory
    //   during multiple uses of source window 
    //   (reinserting entire doc caches all nodes)
    gDialog.tabeditor.enableRulers(true);

    var sourceIframe = editorElement.previousSibling;
    var sourceEditor = sourceIframe.contentWindow.wrappedJSObject.gEditor;
    if (sourceEditor)
    {
      NotifierUtils.notify("beforeLeavingSourceMode");
      source = sourceEditor.getValue();
      var spellchecking = Services.prefs.getBoolPref("bluegriffon.spellCheck.enabled");
      Services.prefs.setBoolPref("bluegriffon.spellCheck.enabled", false);
      //sourceEditor.blur();
      var oldSource = sourceIframe.getUserData("oldSource"); 
      if (source != oldSource) {
        var parser = new DOMParser();
        try {
          var doc = parser.parseFromString(source, isXML ? "text/xml" : "text/html");
          if (doc.documentElement.nodeName == "parsererror") {
            var message = doc.documentElement.firstChild.data
                             .replace( /Location\: chrome\:\/\/bluegriffon\/content\/xul\/bluegriffon.xul/g ,
                                       ", ");
            var error = doc.documentElement.lastChild.textContent;
            window.openDialog("chrome://bluegriffon/content/dialogs/parsingError.xul", "_blank",
                              "chrome,modal,titlebar", message, error);
            gDialog.printPreviewModeButton.removeAttribute("selected");
            gDialog.wysiwygModeButton.removeAttribute("selected");
            gDialog.sourceModeButton.setAttribute("selected", "true");
            editorElement.parentNode.setAttribute("currentmode", "source");
            Services.prefs.setBoolPref("bluegriffon.spellCheck.enabled", spellchecking);
            return false;
          }
          gDialog.structurebar.style.visibility = "";
          RebuildFromSource(doc, isXML);
          var lastSaved = sourceIframe.getUserData("lastSaved");
          if (lastSaved == source)
            EditorUtils.getCurrentEditor().resetModificationCount();
        }
        catch(e) {alert(e)}
      }
      else {
        NotifierUtils.notify("afterLeavingSourceMode");

        editorElement.parentNode.selectedIndex = 1;
        gDialog.structurebar.style.visibility = "";
        window.content.focus();
      }
      sourceIframe.setUserData("lastSaved", "", null);
      Services.prefs.setBoolPref("bluegriffon.spellCheck.enabled", spellchecking);
    }
  }
  editorElement.parentNode.setAttribute("previousMode", mode);
  window.updateCommands("style");
  return true;
}

function CloneElementContents(editor, sourceElt, destElt)
{
  editor.cloneAttributes(destElt, sourceElt);
  var lastChild = destElt.lastChild;
  if (!lastChild || lastChild.nodeName.toLowerCase() != "br") {
    lastChild = editor.document.createElement("br");
    lastChild.setAttribute("type", "_moz");
    editor.insertNode(lastChild, destElt, destElt.childNodes.length);
  }

  var sourceChild = sourceElt.firstChild;
  while (sourceChild) {
    if (sourceChild.nodeType == Node.ELEMENT_NODE) {
      var destChild = editor.document.importNode(sourceChild, true);
      editor.insertNode(destChild, destElt, destElt.childNodes.length);
    }
    else if (sourceChild.nodeType == Node.TEXT_NODE) {
      t = editor.document.createTextNode(sourceChild.data);
      editor.insertNode(t, destElt, destElt.childNodes.length);
    }
    else if (sourceChild.nodeType == Node.COMMENT_NODE) {
      t = editor.document.createComment(sourceChild.data);
      editor.insertNode(t, destElt, destElt.childNodes.length);
    }

    sourceChild = sourceChild.nextSibling;
  }

  var child = destElt.firstChild;
  do {
    var stopIt = (child == lastChild);
    editor.deleteNode(child);
    child = destElt.firstChild;
  } while (!stopIt);
}

function RebuildFromSource(aDoc, isXML)
{
  if (isXML) {
    var fileExt = UrlUtils.getFileExtension( UrlUtils.getDocumentUrl());
    var xhtmlExt = (fileExt == "xhtm" || fileExt == "xhtml");

    var styles = aDoc.querySelectorAll("style");
    var found = false, switchToCDATA = false;
    for (var i = 0; i < styles.length; i++) {
      var style = styles[i];
      var child = style.firstChild;
      while (child) {
        var tmp = child.nextSibling;

        if (child.nodeType == Node.COMMENT_NODE) {
          if (xhtmlExt) {
            // XHTML document with xhtml extension and HTML comments, offer to
            // convert to CDATA sections
            if (!found) {
              found = true;
  
              var rv = PromptUtils.confirmWithTitle(
                                    L10NUtils.getString("HTMLCommentsInXHTMLTitle"),
                                    L10NUtils.getString("HTMLCommentsInXHTMLMessage"),
                                    L10NUtils.getString("HTMLCommentsInXHTMLOK"),
                                    L10NUtils.getString("HTMLCommentsInXHTMLCancel"),
                                    "");
              if (rv == 1) { // cancel button
                child = null;
                tmp = null;
              }
            }
  
            if (child) {
              var e = aDoc.createCDATASection(child.data);
              style.insertBefore(e, child);
              style.removeChild(child);
            }
          }
          else {
            // if we have a XHTML document with a HTML file extension, the user wants to
            // preserve the HTML comments :-(
            var e = aDoc.createTextNode("<!--" + child.data + "-->");
            style.insertBefore(e, child);
            style.removeChild(child);
          }
        }

        child = tmp;
      }
    }
  }

  EditorUtils.getCurrentEditorElement().parentNode.selectedIndex = 1;
  var editor = EditorUtils.getCurrentEditor();

  try {

    // make sure everything is aggregated under one single txn
    editor.beginTransaction();
    // clone html attributes
    editor.cloneAttributes(editor.document.documentElement, aDoc.documentElement);
    // clone head
    CloneElementContents(editor, aDoc.querySelector("head"), editor.document.querySelector("head"));
    // clone body
    CloneElementContents(editor, aDoc.querySelector("body"), editor.document.body);

    var valueArray = [];
    if (!Services.prefs.getBoolPref("bluegriffon.display.comments"))
      valueArray.push("comment");
    if (!Services.prefs.getBoolPref("bluegriffon.display.php"))
      valueArray.push("php");
    if (!Services.prefs.getBoolPref("bluegriffon.display.pi"))
      valueArray.push("pi");
    var value = valueArray.join(" ");
    editor.document.documentElement.setAttribute("_moz_hide", value);

    MakePhpAndCommentsVisible(editor.document);
    editor.endTransaction();

    // the window title is updated by DOMTitleChanged event
  } catch(ex) {
  }
  NotifierUtils.notify("afterLeavingSourceMode");
  window.content.focus();
  EditorUtils.getCurrentEditorElement().focus();
}

function doCloseTab(aTab)
{
  var tabbox = aTab.parentNode.parentNode.parentNode;
  var tabs = aTab.parentNode;
  var tabpanels = tabbox.parentNode.mTabpanels;
  var index = tabs.getIndexOfItem(aTab);
  var selectedIndex = tabbox.selectedIndex;
  var editorBox = tabpanels.childNodes[index];
  tabpanels.removeChild(tabpanels.childNodes[index]);
  tabs.removeChild(aTab);
  if (selectedIndex < tabpanels.childNodes.length)
    tabbox.selectedIndex = selectedIndex;
  else if (tabpanels.childNodes.length)
    tabbox.selectedIndex = selectedIndex - 1;
  if (!tabpanels.childNodes.length) {
    tabbox.parentNode.mHruler.setAttribute("disabled", "true");
    tabbox.parentNode.mVruler.setAttribute("disabled", "true");
    tabbox.parentNode.setAttribute("visibility", "hidden");
    if (gDialog.structurebar)
      gDialog.structurebar.className = "hidden";
    document.title = "BlueGriffon";
  }
  window.updateCommands("style");
  NotifierUtils.notify("tabClosed");
//@line 1185 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"
}

function SetLocationDB()
{
  var mDBConn = GetDBConn();

  mDBConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS 'bgLocations' ('id' INTEGER PRIMARY KEY NOT NULL, 'query' VARCHAR NOT NULL, 'querydate' INTEGER NOT NULL, UNIQUE(query))");
  mDBConn.close();
}

function GetDBConn()
{
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsIFile);
  file.append("bgLocations.sqlite");
  
  var storageService = Components.classes["@mozilla.org/storage/service;1"]
                          .getService(Components.interfaces.mozIStorageService);
  return storageService.openDatabase(file);
}

function doSaveTabsBeforeQuit()
{
  var tabeditor = EditorUtils.getCurrentTabEditor();
  if (!tabeditor)
    return true;
  var tabs = tabeditor.mTabs.childNodes;
  var l = tabs.length;
  for (var i = l-1; i >= 0; i--) {
    var tab = tabs.item(i);
    tabeditor.selectedIndex = i;
    var closed = cmdCloseTab.doCommand();
    if (1 == closed)
      return false;
  }
  return true;
}

function doQuit()
{
  return doSaveTabsBeforeQuit();
}

function OpenPreferences()
{
  var w = null;
  try {
    w = Services.wm.getMostRecentWindow("bluegriffon-prefs");
  }
  catch(e){}
  if (w)
    w.focus();
  else {
    var features = "chrome,titlebar,toolbar,centerscreen,dialog=yes,resizable=yes";
    window.openDialog("chrome://bluegriffon/content/prefs/prefs.xul", "Preferences", features);
  }
}

function OnDoubleClick(aEvent)
{
  var node = aEvent.target;
  while (node && node.nodeType != Node.ELEMENT_NODE)
    node = node.parentNode;
  //EditorUtils.getCurrentEditor().selectElement(node);
  if (!node) // sanity check
    return;

  switch (node.nodeName.toLowerCase()) {
    case "comment":
    case "php":
    case "pi":
      if (node.namespaceURI == "http://disruptive-innovations.com/zoo/bluegriffon") {
        if (node.nodeName.toLowerCase() == "comment"
            && node.lastChild.data.substr(0, 6) == "mozToc")
          CreateOrUpdateTableOfContents();
        else
          window.openDialog("chrome://bluegriffon/content/dialogs/insertCommentOrPI.xul", "_blank",
                            "chrome,close,titlebar,modal,resizable=yes", node);
      }
    case "a":
      if (node.hasAttribute("href")) {
        cmdInsertLinkCommand.doCommand();
      }
      if (node.hasAttribute("name") || node.id) {
        cmdInsertAnchorCommand.doCommand();
      }
      break;
    case "img":
      cmdInsertImageCommand.doCommand();
      break;
    case "video":
      cmdInsertVideoCommand.doCommand();
      break;
    case "audio":
      cmdInsertAudioCommand.doCommand();
      break;
    case "hr":
      cmdInsertHRCommand.doCommand();
      break;
    case "form":
      cmdInsertFormCommand.doCommand();
      break;
    case "input":
      window.openDialog("chrome://bluegriffon/content/dialogs/insertFormInput.xul","_blank",
                        "chrome,modal,titlebar,resizable=no,dialog=yes", node, node.getAttribute("type"));
      break;
   case "fieldset":
      cmdInsertFieldsetCommand.doCommand();
      break;
   case "label":
      cmdInsertLabelCommand.doCommand();
      break;
    case "button":
      cmdInsertButtonCommand.doCommand();
      break;
    case "select":
    case "option":
    case "optgroup":
      cmdInsertSelectCommand.doCommand();
      break;
    case "textarea":
      cmdInsertTextareaCommand.doCommand();
      break;
    case "keygen":
      cmdInsertKeygenCommand.doCommand();
      break;
    case "output":
      break;
    case "progress":
      cmdInsertProgressCommand.doCommand();
      break;
    case "meter":
      cmdInsertMeterCommand.doCommand();
      break;
    case "datalist":
      cmdInsertDatalistCommand.doCommand();
      break;
    case "td":
    case "th":
      // fire the table properties dialog only if the selection is collapsed
      if (EditorUtils.getCurrentEditor().selection.isCollapsed) {
        window.openDialog("chrome://bluegriffon/content/dialogs/insertTable.xul","_blank",
                          "chrome,modal,titlebar,resizable=yes,dialog=no", node);
      }
      break;
    case "li":
    case "ul":
    case "ol":
      {
        var selContainer = EditorUtils.getSelectionContainer();
        if (selContainer.oneElementSelected) {
          cmdEditListCommand.doCommand();
        }
      }
      break;
    default:
      if (node.namespaceURI == "http://www.w3.org/2000/svg")
      {
        while (node.parentNode && node.parentNode.namespaceURI == "http://www.w3.org/2000/svg")
          node = node.parentNode;
        EditorUtils.getCurrentEditor().selectElement(node);
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(node);
        source = '<?xml version="1.0"?>\n' + source;
        try {
          start_svg_edit(source);
        }
        catch(e) {}
      }
    
  }
}

function onBespinFocus(aIframe)
{
  aIframe.focus();
}

function onBespinLineBlur(aElt)
{
  aElt.value = "";
}

function onBespinLineKeypress(aEvent, aElt)
{
  if (aEvent.keyCode == 13) {
    var line = aElt.value;
    EditorUtils.getCurrentSourceEditor().setCursor(parseInt(line) - 1, 0);
    onBespinLineBlur(aElt);
    onBespinFocus(EditorUtils.getCurrentSourceEditorElement());
  }
  if (aEvent.keyCode == 13 ||
      (aEvent.keyCode == 27 && !aEvent.which)) { // ESC key
    gDialog.bespinToolbox1.hidden = true;
    gDialog.bespinToolbox2.hidden = true;
    EditorUtils.getCurrentSourceEditorElement().lastNeedle = null;
    EditorUtils.getCurrentSourceEditorElement().focus();
  }
}

function ToggleBespinFindCaseSensitivity()
{
  var sourceIframe = EditorUtils.getCurrentSourceEditorElement(); 
  var selPoint = sourceIframe.getUserData("selPoint");
  BespinFind(sourceIframe.getUserData("findLastDirection"));
}

function BespinFind(aForward, aInitial)
{
  if (GetCurrentViewMode() == "wysiwyg") {
    if (!gDialog.bespinFindTextbox.value) {
      gDialog.bespinFindPrevious.hidden = true;
      gDialog.bespinFindNext.hidden = true;
      gDialog.bespinToolbox2.hidden = true;
      return false;
    }
    var findInst = EditorUtils.getCurrentEditorElement().webBrowserFind;
    findInst.searchString  = gDialog.bespinFindTextbox.value;
    findInst.matchCase     = gDialog.bespinFindCaseSensitive.checked;
    findInst.wrapFind      = true;
    findInst.findBackwards = !aForward;
    findInst.searchFrames  = true;
    findInst.entireWord    = false;

    var findInFrames = findInst.QueryInterface(Components.interfaces.nsIWebBrowserFindInFrames);
    findInFrames.rootSearchFrame = EditorUtils.getCurrentEditorElement().contentWindow;
    findInFrames.currentSearchFrame = findInFrames.rootSearchFrame;

    if (aInitial) {
      // not sure about that one, let's comment it out for the time being
      //EditorUtils.getCurrentEditor().beginningOfDocument();
    }

    var result = findInst.findNext();

    gDialog.bespinFindTextbox.focus();
    if (result) {
      gDialog.bespinFindCaseSensitive.hidden = false;
      gDialog.bespinFindPrevious.hidden = false;
      gDialog.bespinFindNext.hidden = false;
      gDialog.bespinFindTextbox.className = "";
      gDialog.bespinToolbox2.hidden = false;
      return true;
    }
    gDialog.bespinFindPrevious.hidden = true;
    gDialog.bespinFindNext.hidden = true;
    gDialog.bespinFindTextbox.className = "notfound";
    gDialog.bespinToolbox2.hidden = true;
    return false;
  }
  else {
    var sourceIframe = EditorUtils.getCurrentSourceEditorElement();
    var sourceEditor = sourceIframe.contentWindow.wrappedJSObject.gEditor;
    sourceIframe.setUserData("findLastDirection", aForward, null);
    var query = gDialog.bespinFindTextbox.value;
    var isCaseSensitive = gDialog.bespinFindCaseSensitive.checked;

    var found = sourceIframe.contentWindow.wrappedJSObject.findNeedle(aForward, aInitial, query, isCaseSensitive);

    if (!found) {
      //gDialog.bespinFindCaseSensitive.hidden = true;
      gDialog.bespinFindPrevious.hidden = true;
      gDialog.bespinFindNext.hidden = true;
      gDialog.bespinFindTextbox.className = "notfound";
      gDialog.bespinToolbox2.hidden = true;
      return false;
    }

    gDialog.bespinFindCaseSensitive.hidden = false;
    gDialog.bespinFindPrevious.hidden = false;
    gDialog.bespinFindNext.hidden = false;
    gDialog.bespinFindTextbox.className = "";
    gDialog.bespinToolbox2.hidden = false;
    return true;
  }
}

function onBespinFindClear(aEvent, aElt)
{
  if (!aElt.value) {
    aElt.className = "";
    gDialog.bespinFindCaseSensitive.hidden = true;
    gDialog.bespinFindPrevious.hidden = true;
    gDialog.bespinFindNext.hidden = true;
    gDialog.bespinToolbox2.hidden = true;
  }
}

function onBespinFindKeypress(aEvent)
{
  if (aEvent.keyCode == 27 && !aEvent.which) { // ESC key
    gDialog.bespinToolbox1.hidden = true;
    gDialog.bespinToolbox2.hidden = true;
    if (GetCurrentViewMode() == "source")
      EditorUtils.getCurrentSourceEditorElement().focus();
    else {
      window.content.focus();
    }
  }
}

function BespinKeyPressCallback(aEvent)
{
  if (!aEvent.metaKey &&
      aEvent.ctrlKey &&
      !aEvent.altKey) {
    switch (aEvent.which) {
      case 102: // meta-f
      case 114: // meta-r
        aEvent.preventDefault();
        WysiwygShowFindBar();
        break;
      case 108: // meta-l
        aEvent.preventDefault();
        gDialog.bespinToolbox1.hidden = false;
        gDialog.bespinLineTextbox.focus();
        break;
      /*case 99: // meta-c XXX Workaround for Copy horked in Bespin0.9+Gecko2
      case 120: // meta-x XXX
        {
          aEvent.preventDefault();
          var sourceEditor = EditorUtils.getCurrentSourceEditor();
          var selection = sourceEditor.selectedText;
          var clipboardSvc = Components.classes["@mozilla.org/widget/clipboard;1"].
                             getService(Components.interfaces.nsIClipboard);
          var xferable = Components.classes["@mozilla.org/widget/transferable;1"].
                         createInstance(Components.interfaces.nsITransferable);
          xferable.addDataFlavor("text/unicode");
          var s = Components.classes["@mozilla.org/supports-string;1"].
                  createInstance(Components.interfaces.nsISupportsString);
          s.data = selection;
          xferable.setTransferData("text/unicode", s, selection.length * 2);
          clipboardSvc.setData(xferable, null, Components.interfaces.nsIClipboard.kGlobalClipboard);
        }
        if (aEvent.which == 120)
          sourceEditor.selectedText = "";
        break;*/
      default:
        break;
    }
  }
}

function BespinReplace()
{
  if (GetCurrentViewMode() == "source") {
    var sourceIframe = EditorUtils.getCurrentSourceEditorElement();
    var sourceEditor = sourceIframe.contentWindow.wrappedJSObject.gEditor;
    if (sourceEditor.lastNeedle && sourceEditor.lastNeedle.from() && sourceEditor.lastNeedle.to()) {
      var end = sourceEditor.lastNeedle.to();
      sourceEditor.lastNeedle.replace(gDialog.bespinReplaceTextbox.value);
      sourceEditor.setCursor(end);
      //sourceEditor.focus();
    }
  }
  else
    ReplaceInWysiwyg();
}

function BespinReplaceAndFind()
{
  BespinReplace();
  BespinFind(true, false);
}

function BespinReplaceAll()
{
  var occurences = 0;
  if (GetCurrentViewMode() == "source") {
    var sourceIframe = EditorUtils.getCurrentSourceEditorElement();
    var sourceEditor = sourceIframe.contentWindow.wrappedJSObject.gEditor;
    sourceEditor.setCursor(0,0);
    var query = gDialog.bespinFindTextbox.value;
    var isCaseSensitive = gDialog.bespinFindCaseSensitive.checked;

    sourceIframe.contentWindow.wrappedJSObject.findNeedle(true, true, query, isCaseSensitive);

    //BespinFind(true, false);

    while (sourceEditor.lastNeedle &&
           sourceEditor.lastNeedle.from() &&
           sourceEditor.lastNeedle.to()) {
      occurences++;
      var end = sourceEditor.lastNeedle.to();
      sourceEditor.lastNeedle.replace(gDialog.bespinReplaceTextbox.value);
      sourceEditor.setCursor(end);

      BespinFind(true, false);
      var from = sourceEditor.getCursor(true);
      if (from.line == end.line && from.ch == end.ch)
        break;
    }
  }
  else {
    var found = true;
    var editor = EditorUtils.getCurrentEditor();

    var findInst = EditorUtils.getCurrentEditorElement().webBrowserFind;
    findInst.searchString  = gDialog.bespinFindTextbox.value;
    findInst.matchCase     = gDialog.bespinFindCaseSensitive.checked;
    findInst.wrapFind      = false;
    findInst.findBackwards = false;
    findInst.searchFrames  = true;
    findInst.entireWord    = false;

    var findInFrames = findInst.QueryInterface(Components.interfaces.nsIWebBrowserFindInFrames);
    findInFrames.rootSearchFrame = EditorUtils.getCurrentEditorElement().contentWindow;
    findInFrames.currentSearchFrame = findInFrames.rootSearchFrame;

    EditorUtils.getCurrentEditor().beginningOfDocument();

    var result = findInst.findNext();

    editor.beginTransaction();
    while (result) {
      occurences++;
      ReplaceInWysiwyg();
      result = findInst.findNext();
    }
    editor.endTransaction();
  }
  var title = L10NUtils.getString("ReplaceAll");
  var msg = L10NUtils.getString("ReplacedPart1") +
            " " +
            occurences +
            " " +
            L10NUtils.getString("ReplacedPart2");
  Services.prompt.alert(null, title, msg);
}

function WysiwygShowFindBar()
{
  gDialog.bespinToolbox1.hidden = false;
  gDialog.bespinFindTextbox.focus();
  var editor = EditorUtils.getCurrentEditor();
  if (GetCurrentViewMode() == "wysiwyg") {
    var text = editor.outputToString("text/plain", 1).trim();
    if (text) {
      gDialog.bespinFindTextbox.value = text;
      BespinFind(true, true);
    }
  }
  else {
    var sourceIframe = EditorUtils.getCurrentSourceEditorElement();
    var sourceEditor = sourceIframe.contentWindow.wrappedJSObject.gEditor;
    var text = sourceEditor.getSelection();
    if (text) {
      gDialog.bespinFindTextbox.value = text;
      BespinFind(true, true);
    }
  }
}

function CloseFindBar()
{
  gDialog.bespinToolbox1.hidden = true;
  gDialog.bespinToolbox2.hidden = true;
  window.content.focus();
}

function ReplaceInWysiwyg()
{
  var editor = EditorUtils.getCurrentEditor();

  // Does the current selection match the find string?
  var selection = editor.selection;

  var selStr = selection.toString();
  var specStr = gDialog.bespinFindTextbox.value;
  if (!gDialog.bespinFindCaseSensitive.checked)
  {
    selStr = selStr.toLowerCase();
    specStr = specStr.toLowerCase();
  }
  // Unfortunately, because of whitespace we can't just check
  // whether (selStr == specStr), but have to loop ourselves.
  // N chars of whitespace in specStr can match any M >= N in selStr.
  var matches = true;
  var specLen = specStr.length;
  var selLen = selStr.length;
  if (selLen < specLen)
    matches = false;
  else
  {
    var specArray = specStr.match(/\S+|\s+/g);
    var selArray = selStr.match(/\S+|\s+/g);
    if ( specArray.length != selArray.length)
      matches = false;
    else
    {
      for (var i=0; i<selArray.length; i++)
      {
        if (selArray[i] != specArray[i])
        {
          if ( /\S/.test(selArray[i][0]) || /\S/.test(specArray[i][0]) )
          {
            // not a space chunk -- match fails
            matches = false;
            break;
          }
          else if ( selArray[i].length < specArray[i].length )
          {
            // if it's a space chunk then we only care that sel be
            // at least as long as spec
            matches = false;
            break;
          }
        }
      }
    }
  }

  // If the current selection doesn't match the pattern,
  // then we want to find the next match, but not do the replace.
  // That's what most other apps seem to do.
  // So here, just return.
  if (!matches)
    return false;

  // nsPlaintextEditor::InsertText fails if the string is empty,
  // so make that a special case:
  var replStr = gDialog.bespinReplaceTextbox.value;
  if (replStr == "")
    editor.deleteSelection(0);
  else
    editor.insertText(replStr);

  return true;
}

function BespinChangeCallback()
{
  gDialog.tabeditor.showCurrentTabAsModified(EditorUtils.isDocumentModified());    // || IsHTMLSourceChanged());

}

function BespinActivityCallback()
{
  ComposerCommands.goUpdateCommand("cmd_BGundo");
  ComposerCommands.goUpdateCommand("cmd_BGredo");
  ComposerCommands.goUpdateCommand("cmd_BGcopy");
  ComposerCommands.goUpdateCommand("cmd_BGcut");
  ComposerCommands.goUpdateCommand("cmd_BGpaste");
  ComposerCommands.goUpdateCommand("cmd_BGselectAll");
  ComposerCommands.goUpdateCommand("cmd_BGpasteNoFormatting");
  ComposerCommands.goUpdateCommand("cmd_BGdelete");
}
//@line 1360 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"


var AutoInsertTable = {

  kDEFAULT_ROW_COUNT: 6,
  kDEFAULT_COLUMN_COUNT: 6,

  mRow: null,
  mColumn: null,

  mRows: this.kDEFAULT_ROW_COUNT,
  mColumns: this.kDEFAULT_COLUMN_COUNT,

  reset: function()
  {
    var extraCells = gDialog.AutoInsertTableSizeSelectorRows.querySelectorAll("*[extra]");
    for (var i = 0; i < extraCells.length; i++) {
      var c = extraCells[i];
      c.parentNode.removeChild(c);
    }
    this.mRows = this.kDEFAULT_ROW_COUNT;
    this.mColumns = this.kDEFAULT_COLUMN_COUNT;

    var cells = gDialog.AutoInsertTableSizeSelector.querySelectorAll("label");
    for (var i = 0; i < cells.length; i++)
      cells[i].className = "";

    gDialog.AutoInsertTable_r1c1.className = "selected";
    gDialog.AutoInsertTable_r1c2.className = "selected";
    gDialog.AutoInsertTable_r2c1.className = "selected";
    gDialog.AutoInsertTable_r2c2.className = "selected";
    gDialog.AutoInsertTableSizeLabel.setAttribute("label", "2x2");
  },

  selectArea: function(cell)
  {
    var cellID    = cell.id;
    var r = cellID.match ( /AutoInsertTable_r([0-9]*)c([0-9]*)/ );

    var row = r[1];
    var column = r[2];
  
    // early way out if we can...
    if (this.mRow == row && this.mColumn == column)
      return;
  
    this.mRow = row;
    this.mColumn = column;
  
    var cells = gDialog.AutoInsertTableSizeSelector.querySelectorAll("label");
    for (var i = 0; i < cells.length; i++)
      cells[i].className = "";
  
    for (i = row; i > 0; i--)
    {
      anyCell = document.getElementById("AutoInsertTable_r"+i+"c"+this.mColumn);
      while (anyCell)
      {
        anyCell.setAttribute("class", "selected");
        anyCell = anyCell.previousSibling;
      }
    }
    gDialog.AutoInsertTableSizeLabel.value = this.mRow + " x " + this.mColumn;
  },

  selectSize: function(cell)
  {
    gDialog.AutoInsertTableSheetPopup.hidePopup();
  
    var editor = EditorUtils.getCurrentEditor();
    var doc = EditorUtils.getCurrentDocument();
    var tableElement = doc.createElement("table");
    var tableBody = doc.createElement("tbody");
    tableElement.appendChild(tableBody);
    tableElement.setAttribute("border", "1");
    if (doc.doctype && doc.doctype.publicId == "") // html5
      tableElement.setAttribute("style", "width: 100%");
    else
      tableElement.setAttribute("width", "100%");
    var firstCell = null;
    for (var i = 0; i < this.mRow; i++)
    {
      var newRow = doc.createElement("tr");
      tableBody.appendChild(newRow);
      for (var j = 0; j < this.mColumn; j++)
      {
        var newCell = doc.createElement("td");
        if (!firstCell)
          firstCell = newCell;
        newRow.appendChild(newCell);
      }
    }
    if (GetCurrentViewMode() == "wysiwyg") {
      editor.insertElementAtSelection(tableElement, true);
      editor.selection.collapse(firstCell, 0);
      window.content.focus();
    }
    else {
      var src = style_html(tableElement.outerHTML);
      var srcEditor = EditorUtils.getCurrentSourceEditor();
      srcEditor.replaceSelection(src);
      EditorUtils.getCurrentSourceWindow().focus();
    }
  },

  increaseSize: function(aX, aY)
  {
    if (aX) {
      this.mColumns++;
      var hboxes = gDialog.AutoInsertTableSizeSelector.querySelectorAll("hbox");
      for (var i = 0; i < hboxes.length; i++) {
        var h = hboxes[i];
        var label = document.createElement("label");
        label.setAttribute("onmouseover", "AutoInsertTable.selectArea(this)");
        label.setAttribute("onclick",     "AutoInsertTable.selectSize(this)");
        label.setAttribute("value", "");
        label.setAttribute("extra", "true");
        label.id = "AutoInsertTable_r" + (i+1) + "c" + this.mColumns;
        h.appendChild(label);
      }
    }
    else if (aY) {
      this.mRows++;
      var row = document.createElement("row");
      row.setAttribute("extra", "true");
      var spacer1 = document.createElement("spacer");
      var spacer2 = document.createElement("spacer");
      var hbox = document.createElement("hbox");
      for (var i = 0; i < this.mColumns; i++) {
        var label = document.createElement("label");
        label.setAttribute("onmouseover", "AutoInsertTable.selectArea(this)");
        label.setAttribute("onclick",     "AutoInsertTable.selectSize(this)");
        label.setAttribute("value", "");
        label.id = "AutoInsertTable_r" + this.mRows + "c" + (i+1);
        hbox.appendChild(label);
      }
      row.appendChild(spacer1);
      row.appendChild(hbox);
      row.appendChild(spacer2);
      gDialog.AutoInsertTableSizeSelectorRows.appendChild(row);
    }
  }
};
//@line 1362 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"


function AlignAllPanels()
{
  ScreenUtils.alignPanelsForWindow(window);
  return;
}

function UpdateDeckMenu()
{
  deleteAllChildren(gDialog.deckMenupopup);
  var child = gDialog.beforeAllPanelsMenuseparator.nextSibling;
  while (child) {
    if (child.getAttribute("checked") == "true") {
      var item = document.createElement("menuitem");
      item.setAttribute("label", child.getAttribute("label"));
      item.setAttribute("panel", child.getAttribute("panel"));
      item.setAttribute("type",  "checkbox");
      if (child.getAttribute("decked") == "true")
        item.setAttribute("checked", "true");
      gDialog.deckMenupopup.appendChild(item);
    }

    child = child.nextSibling;
  }
}

function DeckOrUndeckPanel(aEvent)
{
  var menuitem = aEvent.target;
  // we know the panel is visible...
  var realMenuitem = gDialog.beforeAllPanelsMenuseparator.nextSibling;
  while (realMenuitem) {

    if (realMenuitem.getAttribute("panel") == menuitem.getAttribute("panel")) { // that's the one
      // first close the panel
      start_panel(realMenuitem);
      if (menuitem.getAttribute("checked") == "true")
        realMenuitem.setAttribute("decked", "true");
      else
        realMenuitem.removeAttribute("decked");

      start_panel(realMenuitem);
      return;
    }

    realMenuitem = realMenuitem.nextElementSibling;
  }
}

function UpdatePanelsStatusInMenu()
{
  var child = gDialog.beforeAllPanelsMenuseparator.nextSibling;
  if ("UNIX" == gSYSTEM) {
    while(child) {
      var w1, w2 = null;
      // TODO case decked="true"
      try {
        var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
        w1 = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator).getMostRecentWindow(child.getAttribute("windowType"));
      }
      catch(e){}
      if (!w1) { // try to find a decked panel
        w2 = gDialog.deckedPanelsTabs.querySelector("label[panelid='" + child.getAttribute("panel") + "']");
      }
  
      if (w1) {
        child.setAttribute("checked", "true");
        child.setAttribute("decked",  "false");
      }
      else if (w2) {
        child.setAttribute("checked", "true");
        child.setAttribute("decked",  "true");
      }
      else
        child.setAttribute("checked", "false");
  
      document.persist(child.id, "checked");
      document.persist(child.id, "decked");
      child = child.nextElementSibling;
    }
  }
  else { // NOT LINUX
    while (child) {
      var panel = gDialog[child.getAttribute("panel")];
      if (panel && panel.popupBoxObject.popupState == "open") {
        child.setAttribute("checked", "true");
        child.setAttribute("decked",  "false");
      }
      else if (gDialog.deckedPanelsTabs.querySelector("label[panelid='" + child.getAttribute("panel") + "']")) {
        child.setAttribute("checked", "true");
        child.setAttribute("decked",  "true");
      }
      else
        child.setAttribute("checked", "false");
  
      document.persist(child.id, "checked");
      document.persist(child.id, "decked");
      child = child.nextElementSibling;
    }
  }
}

function start_panel(aElt)
{
  if (!aElt.hasAttribute("url"))
    return;

  UpdatePanelsStatusInMenu();

  if (aElt.getAttribute("checked") == "true") { // panel is visible
    if (aElt.getAttribute("decked") == "true") { // visible in deck
      var tab = gDialog.deckedPanelsTabs.querySelector("label[panelid='" + aElt.getAttribute("panel") + "']");
      if (tab)
        gDialog.deckedPanelsTabs.doCloseDeckedPanel(tab);
      else
        alert("panel not found");
    }
    else { // visible in standalone window
      if ("UNIX" == gSYSTEM) {
        var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
        var w = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator).getMostRecentWindow(aElt.getAttribute("windowType"));
        w.close();
      }
      else { // NOT UNIX
        var panel = gDialog[aElt.getAttribute("panel")];
        NotifierUtils.notify("panelClosed", panel.id);
        panel.closePanel(true);
      }
    }
    aElt.setAttribute("checked", "false");
  }
  else { // panel is still invisible
    if (aElt.getAttribute("decked") == "true") { // should be opened in the deck
      gDialog.deckedPanelsTabs.addPanel(aElt.getAttribute("label"),
                                        aElt.getAttribute("url"),
                                        aElt.getAttribute("panel"));
     }
    else { // should be opened as a standalone window or floating panel
      if ("UNIX" == gSYSTEM) {
        window.open(aElt.getAttribute("url"),"_blank",
                    "chrome,resizable,scrollbars=yes");
      }
      else {
        var panel = gDialog[aElt.getAttribute("panel")];
        var iframe = panel.firstElementChild;
        iframe.setAttribute("src", aElt.getAttribute("url"));
        panel.openPanel(null, false);
        NotifierUtils.notify("redrawPanel", panel.id);    
      }
    }
    aElt.setAttribute("checked", "true");
  }
  
  document.persist(aElt.id, "checked");
}

function OnClick(aEvent)
{
  // this is necessary to be able to select for instance video elements
  var target = aEvent.explicitOriginalTarget;
  if (target && (target instanceof Components.interfaces.nsIDOMHTMLVideoElement
                 || target instanceof Components.interfaces.nsIDOMHTMLAudioElement
                 || target instanceof Components.interfaces.nsIDOMHTMLSelectElement)) {
    EditorUtils.getCurrentEditor().selectElement(target);
  }
}

// LINUX ONLY :-(
function start_css()
{
  var w = null;
  try {
    w = Services.wm.getMostRecentWindow("BlueGriffon:CSSProperties");
  }
  catch(e){}
  if (w)
    w.focus();
  else
    window.open('chrome://cssproperties/content/cssproperties.xul',"_blank",
               "chrome,resizable,scrollbars=yes");
}

function UpdateTabHTMLDialect(aEditorElement)
{
  var tabeditor = gDialog.tabeditor;
  var tabs      = tabeditor.mTabs.childNodes;
  var editors   = tabeditor.mTabpanels.childNodes;
  var l = editors.length;
  for (var i = 0; i < l; i++)
  {
    if (editors.item(i).lastChild == aEditorElement)
    {
      var tab = tabs.item(i);

      var doctype = aEditorElement.contentDocument.doctype;
      var systemId = doctype ? doctype.systemId : null;
      switch (systemId) {
        case "http://www.w3.org/TR/html4/strict.dtd": // HTML 4
        case "http://www.w3.org/TR/html4/loose.dtd":
        case "http://www.w3.org/TR/REC-html40/strict.dtd":
        case "http://www.w3.org/TR/REC-html40/loose.dtd":
          tab.setAttribute("tooltiptext", "HTML 4");
          break;
        case "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd": // XHTML 1
        case "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd":
          tab.setAttribute("tooltiptext", "XHTML 1");
          break;
        case "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd":
          tab.setAttribute("tooltiptext", "XHTML 1.1");
          break;
        case "":
          tab.setAttribute("tooltiptext",
             (aEditorElement.contentDocument.documentElement.getAttribute("xmlns") == "http://www.w3.org/1999/xhtml") ?
               "XHTML 5" : "HTML 5");
          break;
        case null:
	        if (aEditorElement.contentDocument.compatMode == "CSS1Compat")
	         tab.setAttribute("tooltiptext", "XHTML 5");
	        else
	         tab.setAttribute("tooltiptext", "HTML 4");
	        break;
        default: break; // should never happen...
      }
      return;
    }
  }          

}

function OpenAddonsSite()
{
  loadExternalURL("http://bluegriffon.com/");
}

function initFontStyleMenu(menuPopup)
{
  for (var i = 0; i < menuPopup.childNodes.length; i++)
  {
    var menuItem = menuPopup.childNodes[i];
    var theStyle = menuItem.getAttribute("state");
    if (theStyle)
    {
      menuItem.setAttribute("checked", theStyle);
    }
  }
}

function ToggleAllTagsMode()
{
  var tab = gDialog.tabeditor.selectedTab;
  if (tab) {
    var editor = EditorUtils.getCurrentEditor();
    editor instanceof Components.interfaces.nsIEditorStyleSheets;
    var scrollTop = editor.document.documentElement.scrollTop;
    if (tab.hasAttribute("alltags")) {
      tab.removeAttribute("alltags");
      editor.enableStyleSheet("chrome://bluegriffon/content/EditorAllTags.css", false);
    }
    else {
      tab.setAttribute("alltags", "true");
      editor.enableStyleSheet("chrome://bluegriffon/content/EditorAllTags.css", true);
    }
    editor.document.documentElement.scrollTop = scrollTop;
  }
}

function UpdateViewMenu()
{
  var tab = gDialog.tabeditor.selectedTab;
  if (tab) {
    if (tab.hasAttribute("alltags")) {
      gDialog.allTagsModeMenuitem.setAttribute("checked", "true");
      return;
    }
  }
  gDialog.allTagsModeMenuitem.removeAttribute("checked");
}

/*********** CONTEXT MENU ***********/

function GetParentTable(element)
{
  var node = element;
  while (node)
  {
    if (node.nodeName.toLowerCase() == "table")
      return node;

    node = node.parentNode;
  }
  return node;
}

function UpdateEditorContextMenu(event, aMenupopup)
{
  if (event.explicitOriginalTarget.id == "editorContextMenu") {
    var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");
    sc.initFromEvent(document.popupRangeParent, document.popupRangeOffset);

    gDialog.spellCheckMenu.disabled = !sc.overMisspelling;

    // the following is finally not desirable ; commented out for the time being
    /*try {
      EditorUtils.getCurrentEditor().selectElement(document.popupNode);
    }
    catch(e) {}*/

    var element = GetParentTable(document.popupNode);
    var idstart = "separator_before_ctableInsertMenu";
    var idend   = "cmenu_tableProperties";
    var elt = gDialog[idstart];
    var currentId;
    do {
      if (element)
        elt.removeAttribute("hidden");
      else
        elt.setAttribute("hidden", "true");
      currentId = elt.id;
      elt = elt.nextElementSibling;
    } while (currentId != idend);
  }
}

function UpdateSpellCheckMenu(aMenupopup)
{
  var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");

  var suggestions = 10;
  try {
    suggestions = Services.prefs.getIntPref("bluegriffon.spellCheck.suggestions");
  }
  catch(e) {}

  sc.addSuggestionsToMenu(aMenupopup, gDialog.suggestionsSpellCheckSeparator, suggestions);
}

function CleanSpellCheckMenu()
{
  var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");
  sc.clearSuggestionsFromMenu();
}

function AddWordToDictionary()
{
  var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");
  sc.addToDictionary();
}

function UpdateSpellCheckDictionaries(aMenupopup)
{
  var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");
  sc.addDictionaryListToMenu(aMenupopup, null);
}

function CleanSpellCheckDictionaries()
{
  var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");
  sc.clearDictionaryListFromMenu();
}

function IgnoreWord()
{
  var sc = EditorUtils.getCurrentEditorElement().getUserData("spellchecker");
  sc.ignoreWord();
}

//@line 1730 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"
function OpenCharInsertionDialog()
{
  var w = null;
  try {
    w = Services.wm.getMostRecentWindow("BlueGriffon:insertCharsDlg");
  }
  catch(e){}
  if (w)
    w.focus();
  else
   window.openDialog("chrome://bluegriffon/content/dialogs/insertChars.xul","_blank",
                     "chrome,modal=no,titlebar");
}
//@line 1744 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"


var gDummySelectionStartNode = null;
var gDummySelectionEndNode = null;
var gDummySelectionStartData = "";
var gDummySelectionEndData = "";

function MarkSelection()
{
  gDummySelectionStartNode = null;
  gDummySelectionEndNode = null;
  gDummySelectionStartData = "";
  gDummySelectionEndData = "";
  
  const kBGBGBG = "--BG--";

  var selection = EditorUtils.getCurrentEditor().selection;
  for (var count = 0; count < 1; count++) {
    var range = selection.getRangeAt(count);
    var startContainer = range.startContainer;
    var endContainer   = range.endContainer;
    var startOffset    = range.startOffset;
    var endOffset      = range.endOffset;

    if (startContainer.nodeType == Node.TEXT_NODE) {
      var data = startContainer.data;
      gDummySelectionStartNode = startContainer;
      gDummySelectionStartData = data;
      data = data.substr(0, startOffset) + kBGBGBG + data.substr(startOffset);
      startContainer.data = data;
    }
    else if (startContainer.nodeType == Node.ELEMENT_NODE) {
      if (startOffset < startContainer.childNodes.length) {
        var node = startContainer.childNodes.item(startOffset);
        if (node.nodeType == Node.TEXT_NODE) {
          var data = node.data;
          gDummySelectionStartNode = node;
          gDummySelectionStartData = data;
          data = kBGBGBG + data;
          node.data = data;
        }
        else {
          var t = EditorUtils.getCurrentDocument().createTextNode(kBGBGBG);
          gDummySelectionStartNode = t;
          startContainer.insertBefore(t, node);
        }
      }
      else {
        var t = EditorUtils.getCurrentDocument().createTextNode(kBGBGBG);
        gDummySelectionStartNode = t;
        startContainer.appendChild(t);
      }
    }

    if (endContainer.nodeType == Node.TEXT_NODE) {
      // same node as start node???
      if (endContainer == startContainer) {
        var data = endContainer.data;
        gDummySelectionEndNode = endContainer;
        gDummySelectionEndData = data;
        data = data.substr(0, endOffset + kBGBGBG.length) + kBGBGBG + data.substr(endOffset + kBGBGBG.length);
        endContainer.data = data;
      }
      else {
        var data = endContainer.data;
        gDummySelectionEndNode = endContainer;
        gDummySelectionEndData = data;
        data = data.substr(0, endOffset) + kBGBGBG + data.substr(endOffset);
        endContainer.data = data;
      }
    }
    else if (endContainer.nodeType == Node.ELEMENT_NODE) {
      var node = endContainer.childNodes.item(Math.max(0, endOffset - 1));
      if (node.nodeType == Node.TEXT_NODE) {
        var data = node.data;
        gDummySelectionEndNode = node;
        gDummySelectionEndData = data;
        data += kBGBGBG;
        node.data = data;
      }
      else {
        var t = EditorUtils.getCurrentDocument().createTextNode(kBGBGBG);
        gDummySelectionEndNode = t;
        endContainer.insertBefore(t, node.nextSibling);
      }
    }
  }
}

function UnmarkSelection()
{
  if (gDummySelectionEndNode) {
    if (gDummySelectionEndData)
      gDummySelectionEndNode.data = gDummySelectionEndData;
    else
      gDummySelectionEndNode.parentNode.removeChild(gDummySelectionEndNode);
  }

  if (gDummySelectionStartNode) {
    if (gDummySelectionStartData)
      gDummySelectionStartNode.data = gDummySelectionStartData;
    else if (gDummySelectionStartNode.parentNode) // if not already removed....
      gDummySelectionStartNode.parentNode.removeChild(gDummySelectionStartNode);
  }
}

function MarkSelectionInAce(aSourceEditor)
{
  const kBGBGBG = "--BG--";

  aSourceEditor.setSelection( { line: 0, ch: 0 }, { line: 0, ch: 0 } );

  var searchCursor = aSourceEditor.getSearchCursor(kBGBGBG, { line: 0, ch: 0 }, true);
  searchCursor.findNext();
  var startRow    = searchCursor.from().line;
  var startColumn = searchCursor.from().ch;
  searchCursor.replace("");

  searchCursor = aSourceEditor.getSearchCursor(kBGBGBG, { line: 0, ch: 0 }, true);
  searchCursor.findNext();
  var endRow      = searchCursor.from().line;
  var endColumn   = searchCursor.from().ch;
  searchCursor.replace("");

  aSourceEditor.clearHistory();
  aSourceEditor.setSelection( { line: startRow, ch: startColumn }, { line: endRow, ch: endColumn } );
}

function FillAceThemesMenupopup()
{
  deleteAllChildren(gDialog.themesMenupopup);
  var aceIframe = EditorUtils.getCurrentSourceEditorElement();
  var currentTheme = aceIframe.contentWindow.wrappedJSObject.getCurrentTheme();
  for (var i = 0; i < kTHEMES.length; i++) {
    var s = document.createElement("menuitem");
    s.setAttribute("label", kTHEMES[i]);
    s.setAttribute("value", kTHEMES[i]);
    s.setAttribute("type", "checkbox");
    if (kTHEMES[i] == currentTheme)
      s.setAttribute("checked", "true");
    gDialog.themesMenupopup.appendChild(s);
  }
}

function UseAceTheme(aEvent)
{
  var theme = aEvent.originalTarget.getAttribute("value");
  var aceIframe = EditorUtils.getCurrentSourceEditorElement();
  aceIframe.contentWindow.wrappedJSObject.useTheme(theme);
}

//@line 1928 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\js\bluegriffon.js"

function SaveCurrentTabLocation()
{
  try {
    if (!Services.prefs.getBoolPref("bluegriffon.defaults.restorePreviousSession"))
      return;
  }
  catch(e) {}

  var URL = EditorUtils.getDocumentUrl();
  var lastTabs = "";
  try {
    lastTabs = Services.prefs.getCharPref("bluegriffon.defaults.lastTabs");
  }
  catch(e) {}
  lastTabs += (lastTabs ? "|" : "") + URL;
  try {
    Services.prefs.setCharPref("bluegriffon.defaults.lastTabs", lastTabs);
  }
  catch(e) {}
}

function SaveTabs()
{
  try {
    Services.prefs.setCharPref("bluegriffon.defaults.lastTabs", "");
  }
  catch(e) {}
}

function CreateOrUpdateTableOfContents()
{
  window.openDialog("chrome://bluegriffon/content/dialogs/insertTOC.xul","_blank",
                    "chrome,modal,titlebar");
}

function ShowUpdates()
{
  // copied from checkForUpdates in mozilla/browser/base/content/utilityOverlay.js
  var um =
    Components.classes["@mozilla.org/updates/update-manager;1"]
              .getService(Components.interfaces.nsIUpdateManager);
  var prompter =
    Components.classes["@mozilla.org/updates/update-prompt;1"]
              .createInstance(Components.interfaces.nsIUpdatePrompt);

  // If there's an update ready to be applied, show the "Update Downloaded"
  // UI instead and let the user know they have to restart the browser for
  // the changes to be applied.
  if (um.activeUpdate && um.activeUpdate.state == "pending")
    prompter.showUpdateDownloaded(um.activeUpdate);
  else
    prompter.checkForUpdates();
}

function CheckForUpdates(aPopup)
{
  var item = aPopup.querySelector("#menu_updates");
  if (item) {
    // copied from buildHelpMenu in mozilla/browser/base/content/utilityOverlay.js
    var updates =
      Components.classes["@mozilla.org/updates/update-service;1"]
                .getService(Components.interfaces.nsIApplicationUpdateService);
    var um =
      Components.classes["@mozilla.org/updates/update-manager;1"]
                .getService(Components.interfaces.nsIUpdateManager);

    // Disable the UI if the update enabled pref has been locked by the
    // administrator or if we cannot update for some other reason
    var checkForUpdates = item;
    var canCheckForUpdates = updates.canCheckForUpdates;
    checkForUpdates.setAttribute("disabled", !canCheckForUpdates);
    if (!canCheckForUpdates)
      return;

    var strings =
      Services.strings
              .createBundle("chrome://bluegriffon/locale/updates.properties");
    var activeUpdate = um.activeUpdate;

    // If there's an active update, substitute its name into the label
    // we show for this item, otherwise display a generic label.
    function getStringWithUpdateName(key) {
      if (activeUpdate && activeUpdate.name)
        return strings.formatStringFromName(key, [activeUpdate.name], 1);
      return strings.formatStringFromName(key, ["..."], 1);
    }

    // By default, show "Check for Updates..."
    var key = "update.checkInsideButton";
    if (activeUpdate) {
      switch (activeUpdate.state) {
      case "downloading":
        // If we're downloading an update at present, show the text:
        // "Downloading Instantbird x.x..." otherwise we're paused, and show
        // "Resume Downloading Instantbird x.x..."
        key = updates.isDownloading ? "update.checkInsideButton" : "update.resumeButton";
        break;
      case "pending":
        // If we're waiting for the user to restart, show: "Apply Downloaded
        // Updates Now..."
        key = "update.restart.applyButton";
        break;
      }
    }
    checkForUpdates.label     = getStringWithUpdateName(key + ".label");
    checkForUpdates.accessKey = strings.GetStringFromName(key + ".accesskey");
    if (um.activeUpdate && updates.isDownloading)
      checkForUpdates.setAttribute("loading", "true");
    else
      checkForUpdates.removeAttribute("loading");
  }
}

function onFontColorChange()
{
  var commandNode = document.getElementById("cmd_fontColor");
  if (commandNode)
  {
    var color = commandNode.getAttribute("state");
    var button = document.getElementById("TextColorColorpicker");
    if (button)
    {
      // No color set - get color set on page or other defaults
      if (!color || color == "mixed")
        color = "transparent";
      button.color = color;
    }
  }
}

function onBackgroundColorChange()
{
  var commandNode = document.getElementById("cmd_highlight");
  if (commandNode)
  {
    var color = commandNode.getAttribute("state");
    var button = document.getElementById("BackgroundColorColorpicker");
    if (button)
    {
      if (!color || color == "mixed")
        color = "transparent";
      button.color = color;
    }
  }
}

function RevertTab()
{
  var tab = document.popupNode;

  if (gDialog.tabeditor.selectedTab != tab) {
    // not the current tab, make sure to select it
    var index = 0;
    var child = tab;
    while (child.previousElementSibling) {
      index++;
      child = child.previousElementSibling;
    }
    gDialog.tabeditor.selectedIndex = index;
  }

  var rv = 0;
  if (EditorUtils.isDocumentModified()) {
    var promptService = Services.prompt;

    var title = EditorUtils.getDocumentTitle();
    if (!title)
      title = L10NUtils.getString("untitled");
  
    var msg = L10NUtils.getString("AbandonChanges").replace(/%title%/,title);
    rv = promptService.confirmEx(
               window,
               L10NUtils.getString("RevertCaption"),
               msg,
               (promptService.BUTTON_TITLE_REVERT * promptService.BUTTON_POS_0)
                 + (promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_1),
               null, null, null, null, {value:0});
  }

  if (rv == 0)
  {
    var url = EditorUtils.getDocumentUrl();
    var editorElt = EditorUtils.getCurrentEditorElement();

    editorElt.setAttribute("src", "about:blank");
    editorElt.setAttribute("src", url);
  }
}

function CloseOneTab()
{
  var tab = document.popupNode;

  if (gDialog.tabeditor.selectedTab != tab) {
    // not the current tab, make sure to select it
    var index = 0;
    var child = tab;
    while (child.previousElementSibling) {
      index++;
      child = child.previousElementSibling;
    }
    gDialog.tabeditor.selectedIndex = index;
  }

  cmdCloseTab.doCommand();
}

function CloseAllTabsButOne()
{
  var tab = document.popupNode;

  var child = tab.parentNode.firstElementChild;
  while (child) {
    var tmp = child.nextElementSibling;

    if (child != tab) {
      var index = 0;
      var child2 = child;
      while (child2.previousElementSibling) {
        index++;
        child2 = child2.previousElementSibling;
      }
      gDialog.tabeditor.selectedIndex = index;

      if (cmdCloseTab.doCommand() == 1)
        child = null;
      else
        child = tmp;
    }
    else
      child = tmp;
  }
}

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is DWT Groker.
 *
 * The Initial Developer of the Original Code is
 * Disruptive Innovations SARL.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Daniel Glazman (glazman@disruptive-innovations.com), Original author
 *   Fabien Cazenave <kaze@kompozer.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const BLUEGRIFFON_NS = "http://disruptive-innovations.com/zoo/bluegriffon";

function MakePhpAndCommentsVisible(doc)
{
  function acceptNode(node)
  {
    if ((node.nodeType == Node.COMMENT_NODE
         || node.nodeType == Node.PROCESSING_INSTRUCTION_NODE)
        && node.parentNode.getAttribute("xmlns") != BLUEGRIFFON_NS) {
      return NodeFilter.FILTER_ACCEPT;
    }
    return NodeFilter.FILTER_SKIP;
  }

  var element = doc.documentElement;
  var editor = EditorUtils.getCurrentEditor();
  var treeWalker = doc.createTreeWalker(element,
                                        NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_PROCESSING_INSTRUCTION,
                                        acceptNode,
                                        true);

  function _tweakNode(aNode) {
    if (aNode.nodeType == Node.COMMENT_NODE)
    {
      // do we have a comment created from a PI?
      var data = aNode.data;
      var target = "";
      var d      = "";
      if (data.substr(0, 4) == "?php" && data[data.length - 1] == "?") {
        target = "php"
        d      = data.substr(5, data.length - 6);
      }
      else if (data[0] == "?" && data[data.length - 1] == "?") {
        target = data.substr(1, data.indexOf(" ") - 1);
        d      = data.substr(data.indexOf(" ") + 1);
        d      = d.substring(0, d.length - 1);
       }

       if (target) {
        var pi = doc.createProcessingInstruction(target, d);

        var txn = new diNodeInsertionTxn(pi, aNode.parentNode, aNode);
        editor.transactionManager.doTransaction(txn);
        //editor.deleteNode(aNode);
        txn = new diNodeDeletionTxn(aNode);
        editor.transactionManager.doTransaction(txn);
        aNode = pi;
       }
    }

    var p = aNode;
    var ok = false;
    while (p && !ok) {
      var n = p.nodeName.toLowerCase();
      ok = (n == "body" || n == "head");
      p = p.parentNode;
    }
    if (ok) {
      var span, text;
      if (aNode.nodeType == Node.COMMENT_NODE)
      {
          span = doc.createElementNS(BLUEGRIFFON_NS, "comment");
          text = aNode.data;
      }
      else if (aNode.nodeType == Node.PROCESSING_INSTRUCTION_NODE)
      {
        if (aNode.target == "php")
        {
          span = doc.createElementNS(BLUEGRIFFON_NS, "php");
          text = aNode.data;
        }
        else
        {
          span = doc.createElementNS(BLUEGRIFFON_NS, "pi");
          text = aNode.target + " " + aNode.data;
        }
      }

      span.setAttribute("xmlns", BLUEGRIFFON_NS);
      if (text.length > 22)
        text = text.substr(0, 22) + "...";
      span.setAttribute("title", text);
      txn = new diNodeInsertionTxn(span, aNode.parentNode, aNode);
      editor.transactionManager.doTransaction(txn);

      var clone = aNode.cloneNode(true);
      txn = new diNodeInsertionTxn(clone, span, null);
      editor.transactionManager.doTransaction(txn);
      editor.deleteNode(aNode);
    }
  }

  if (treeWalker) {
    var anchorNode = treeWalker.nextNode();
    while (anchorNode) {
      var tmp = treeWalker.nextNode();
      _tweakNode(anchorNode)
      anchorNode = tmp;
    }
  }
  var anchorNode = doc.firstChild;
  while (anchorNode) {
    var tmp = anchorNode.nextSibling;
    _tweakNode(anchorNode)
    anchorNode = tmp;
  }
}

