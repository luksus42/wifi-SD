var api = external.getUnityObject('1.0');
      	var hub = api.ContentHub;

function Application(UIContext) {
    this._uiContextClass = UIContext;
    this._initialized = false;
};
Application.prototype.init = function() {
    if (this._uiContextClass && !this._initialized) {
        this._initialized = true;
        var UI = new this._uiContextClass();
        UI.init();

        // init localstorage
        initLocalStorage();

        UI.pagestack.push("folders");

        UI.button("refreshFolders").click(function () {
            initFolders(UI);
        });

        UI.button("refreshGallery").click(function () {
            initGallery(null, {"folder":localStorage.getItem("activeFolder"), "UI":UI});
        });

        UI.button("closeDialog").click(function () {
            UI.dialog("infoDialog").hide();
        });

        UI.button("showExif").click(function () {
            var exifElem = document.getElementById("exif");

            if (exifElem.style.display === "none" || exifElem.style.display === "") {
                exifElem.style.display = "block";
                this.innerHTML = "hide EXIF data";
            }
            else {
                exifElem.style.display = "none";
                this.innerHTML = "show EXIF data";
            }

        });

        UI.button("settingsBtn").click(function () {
            // set settings from localStorage
            document.getElementById("serverUrl").value = localStorage.getItem("serverIP");

            UI.pagestack.push("settings");
        });

        UI.button("save").click(function () {

            if (typeof(Storage) !== "undefined") {
                localStorage.setItem("serverIP", document.getElementById("serverUrl").value);
            } else {
                alert("Sorry! No Web Storage support..");
            }
            //settingsDialog.hide();
            UI.pagestack.pop("settings");

            initFolders(UI);
        });



    }
};
Application.prototype.initialized = function() {
    return this._initialized;
};


function initGallery(target, params) {
    var UI = params.UI;
    var files;
    var url = "http://"+localStorage.getItem("serverIP")+"/cgi-bin/tslist?PATH=/www/sd/DCIM/"+params.folder+"/";
    var thumbnailsUrl = "http://"+localStorage.getItem("serverIP")+"/cgi-bin/thumbNail?fn=/www/sd/DCIM/"+params.folder+"/";

    var lastFolder = localStorage.getItem("activeFolder");

    if (lastFolder !== params.folder) {
    	localStorage.setItem("activeFolder", params.folder);
    	document.getElementById("gallery").innerHTML = '';
    	document.getElementById("gallery").setAttribute("data-title", params.folder);
	}

    if (UI.pagestack.currentPage() !== "gallery") {
        UI.pagestack.push("gallery");
    }

    var xhr = new XMLHttpRequest();
    //xhr.withCredentials = true;
    xhr.timeout = 5000;
    xhr.open('GET', url);
    //xhr.setRequestHeader("Authorization", "Basic THVrYXM6a2FzaW1pcg==");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {

            var res = xhr.responseText.split('\n')[2];
            files = getFileList(res);

            getThumbnails(UI, files, thumbnailsUrl);

        } else if (xhr.readyState == 4) {
            openInfoDialog(UI, "Something is wrong with your connection settings!");
        }
    }
    xhr.ontimeout = function () {
        openInfoDialog(UI, "Connection timed out!");
    }
    xhr.send();
}

function initFolders(UI) {
    var files;
    var serverUrl = localStorage.getItem("serverIP");
    var url = "http://"+localStorage.getItem("serverIP")+"/cgi-bin/tslist?PATH=/www/sd/DCIM/";

    var list = UI.list("#folderlist");
    list.removeAllItems();

    var xhr = new XMLHttpRequest();
    xhr.timeout = 5000;
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {

            var res = xhr.responseText.split('\n')[2];
            files = getFileList(res);

            for (var i=0; i<files.length; i++) {
                list.append(
                    files[i],
                    null,
                    "folder-"+files[i],
                    initGallery,
                    {
                        "folder":files[i],
                        "UI":UI
                    }
                );
            }

        } else if (xhr.readyState == 4) {
            openInfoDialog(UI, "Something is wrong with your connection settings!");
        }
    }
    xhr.ontimeout = function () {
        openInfoDialog(UI, "Connection timed out!");
    }
    xhr.send();
}

function getFileList(str) {
    var re = /FileName[0-9]+\=(.+?.+?)&/g;
    var m;
    var files = [];

    while ((m = re.exec(str)) !== null) {
        if (m.index === re.lastIndex) {
            re.lastIndex++;
        }
        files.push(m[1]);
    }

    return files;
}

function getThumbnails(UI, files, url) {

    var doc = document.getElementById("gallery");

    for(i = 0; i < files.length; i++) {

        if(!document.getElementById(files[i])) {
            var imgContainer = document.createElement("div");
            imgContainer.setAttribute("data-role", "shape");
            imgContainer.id = files[i];

            var newThumb = document.createElement("div");
            newThumb.style.backgroundImage = "url('"+url + files[i]+"')";
            newThumb.className = "imageThumbnail";

            imgContainer.appendChild(newThumb);

            imgContainer.addEventListener("click", function(e) {
            	document.getElementById("preview").setAttribute("data-title", e.srcElement.id);
                var prevImg = document.getElementById("previewImage");
                prevImg.setAttribute("src", "http://"+localStorage.getItem("serverIP")+"/sd/DCIM/"+localStorage.getItem("activeFolder")+"/" + e.srcElement.id);
                
                // EXIF DATA
                prevImg.onload = function() {
                    EXIF.getData(this, function() {
                        var exifData = EXIF.pretty(this).split("\n");
                        var textContent = "";

                        for(i = 0; i < exifData.length; i++) {
                            textContent += exifData[i] + "<br />"
                        }
                        document.getElementById("exif").innerHTML = textContent;
                    });
                }

                UI.button("download").click(function () {

	            });

				UI.button("share").click(function () {
					share({
						"src": prevImg.src,
						"name": e.srcElement.id
					});
	            });

	            UI.pagestack.push("preview");
	        });

            doc.appendChild(imgContainer);
        }
   }
}

function share(item) {
	var api = external.getUnityObject(1.0);
	var hub = api.ContentHub;

	var transferState = hub.ContentTransfer.State;

	function _shareRequested(transfer) {
		var url = item.src;

		transfer.setItems([{name: item.name, url: url}],
			function() {
	 			transfer.setState(hub.ContentTransfer.State.Charged);
			});
	};

	hub.onExportRequested(_exportRequested);
}

function openInfoDialog(UI, infoText) {
    document.getElementById("infoDialogText").innerHTML = infoText;
    UI.dialog("infoDialog").show();
}

function initLocalStorage() {
    if (localStorage.getItem("serverIP") == null)
        localStorage.setItem("serverIP", "0.0.0.0");

    localStorage.setItem("activeFolder", "");
}