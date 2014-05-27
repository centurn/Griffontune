Components.utils.import("resource://app/modules/cssHelper.jsm");
Components.utils.import("resource://app/modules/editorHelper.jsm");
Components.utils.import("resource://app/modules/urlHelper.jsm");

var gNode = null;

function Startup()
{
  gNode = window.arguments[0];
  var url = window.arguments[1];

  GetUIElements();

  InitDialog();

  var docUrl = EditorUtils.getDocumentUrl();
  var docUrlScheme = UrlUtils.getScheme(docUrl);
  if (docUrlScheme && docUrlScheme != "resource") {
    gDialog.relativeURLCheckbox.disabled = false;
    gDialog.relativeURLCheckboxWarning.hidden = true;
  }

  if (url) {
    gDialog.imageURLTextbox.value = url;
    LoadImage();
    MakeRelativeUrl();
    SetFocusToAlt();
  }

  document.documentElement.getButton("accept").setAttribute("disabled", "true");
  //window.sizeToContent();
//@line 33 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\dialogs\insertImage.js"
  CenterDialogOnOpener();
//@line 35 "c:\Temp\grifsrc\mozilla-2.0\bluegriffon\base\content\bluegriffon\dialogs\insertImage.js"
}

function onAccept()
{
  // general
  var url = GetURLBase();
  var title = gDialog.titleTextbox.value;
  var altText = gDialog.alternateTextTextbox.value;

  var urlOrig = url + "_orig";
  var urlJpg = url + "_XL.jpg";

  var isWysiwyg = (EditorUtils.getCurrentViewMode() == "wysiwyg");
  var editor = EditorUtils.getCurrentEditor(); 
  if (gNode && isWysiwyg) {
    editor.beginTransaction();
    editor.setAttribute(gNode, "src", urlJpg);
    if (altText)
      editor.setAttribute(gNode, "alt", altText);
    else
      editor.removeAttribute(gNode, "alt");
    if (title)
      editor.setAttribute(gNode, "title", title);
    else
      editor.removeAttribute(gNode, "title");
    
    editor.endTransaction();
  }
  else {
    var aElement = EditorUtils.getCurrentDocument().createElement("a");

    aElement.setAttribute("target","_blank");
    aElement.setAttribute("href", urlOrig);

    var spanElement = EditorUtils.getCurrentDocument().createElement("span");
    spanElement.setAttribute("style", "color:#000000;");
    aElement.appendChild(spanElement);


    var imgElement = EditorUtils.getCurrentDocument().createElement("img");

    spanElement.appendChild(imgElement);

    imgElement.setAttribute("src", urlJpg);
    imgElement.setAttribute("border", "0");
    imgElement.setAttribute("alt", altText);
    imgElement.setAttribute("style", "border-width: 1px; border-style: solid;");
    if (title)
      imgElement.setAttribute("title", title);
    if (isWysiwyg) 
      editor.insertElementAtSelection(aElement, true);
    else {
      var src = style_html(aElement.outerHTML);
      var srcEditor = EditorUtils.getCurrentSourceEditor();
      srcEditor.replaceSelection(src);
    }
  }
}

function GetURLBase()
{
    var url = gDialog.imageURLTextbox.value;
    if(url.substring(url.length - 2) == "_S")
        return url.substring(0, url.length - 2);
    if(url.substring(url.length - 7) == "_XL.jpg")
        return url.substring(0, url.length - 7);

    return url;
}


function LoadImage()
{
  var url = GetURLBase();
  var urlJpg = url + "_L.jpg";

  gDialog.previewImage.style.backgroundImage = 'url("' +
    UrlUtils.makeAbsoluteUrl(urlJpg.trim()) + '")';
  UpdateButtons();
}

function UpdateButtons()
{
  var url = gDialog.imageURLTextbox.value;
  var ok = (url && url.length > 7 &&
    (url.substring(url.length - 2) == "_S" || url.substring(url.length - 7) == "_XL.jpg" ) );

  SetEnabledElement(document.documentElement.getButton("accept"), ok);
}

function SetFocusToAlt()
{
  gDialog.alternateTextTextbox.focus();
}

function InitDialog()
{
  if (!gNode)
    return;

  var url = gNode.getAttribute("src");
  gDialog.imageURLTextbox.value = url;
  LoadImage();
  gDialog.titleTextbox.value = gNode.getAttribute("title");
  gDialog.alternateTextTextbox.value = gNode.getAttribute("alt");
}

