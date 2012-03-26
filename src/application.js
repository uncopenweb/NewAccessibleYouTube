// Accessible YouTube

dojo.require('dojo.window');
dojo.require('dojo.io.script');

dojo.ready(function(){
	window.app = new youtube.Main();
});

dojo.declare('youtube.Main', null, {
	aC: {
		"devkey": "AI39si61JkTRRLScpnvH9VvPq4iTVsg0O15u5brhMLiDw6T_OES9rgaJ43fU9rBXQyU3OdVXXdqNU3Yn249xey7ygHFKYTdSOQ",
		"title": "Accessible YouTube",
		"vThumbs": 5,
		"vThumbsMax": 25,
		"vThumbsMaxPages": 5,
		"playerWidth": 720,
		"playerHeight": 405,
		"thumbHeight": 99,
		"currentPage": "splash",
		"currentSearch": "",
		"currentVideoId": "",
		"selectedVideoId": "",
		"currentPlaylistPage": 1,
		"currentPlaylistPos": 1,
		"selectedPlaylistPos": 1,
		"currentMenuPos": 1,
		"videoSelected": false,
		"controls": ["pause","change","beginning","back","forward","related"],
		"playerState": -1,
		"playlistArr": [],
		"vs": {}
	},
	constructor: function(){
		this.handleDimensions();
		this.loadPlayer();

		dojo.query('.home-link').connect('onclick', this, function(){
			this.showPage('splash');
		});

		dojo.connect(dojo.byId('most_popular-link'), 'onclick', this, function(){
			this.showPage('main');
			this.getVideos('popular');
		});

		dojo.connect(dojo.byId('options-link'), 'onclick', this, function(){
			this.showPage('options');
		});
		
		dojo.connect(dojo.byId('instructions-link'), 'onclick', this, function(){
			this.showPage('instructions');
		});

		dojo.connect(dojo.byId('b_search'), 'onclick', this, function(){
			var search = dojo.byId('sB').value;
			if (search.length == 0) return;
			this.aC.currentSearch = search;
			this.showPage('main');
			this.getVideos();
		});
		
		dojo.query('#control-list li').connect('onclick', this, function(e){
			if (!this.aC.videoSelected) return;
			this.controlList(e.target.id);
		});
		
		dojo.subscribe('/video-list/loaded', function(){
			dojo.query('#video-list li').connect('onclick', function(e){
				var vid = dojo.attr(this, "id"), index = -1;
				if (vid) { 
					if (vid == window.app.aC.currentVideoId) return;
					window.app.loadVideo(vid);
					window.app.aC.videoSelected = true;
					var i = 0, begin = ((window.app.aC.currentPlaylistPage - 1) * window.app.aC.vThumbs), end = (window.app.aC.currentPlaylistPage * window.app.aC.vThumbs);
					for (i = begin; i < end; i++) {
						if (index > -1) break;
						if (window.app.aC.playlistArr[i].id == vid) index = i;
					}
					window.app.aC.currentPlaylistPos = index;
					console.log('begin',begin,'end',end,'pos',window.app.aC.currentPlaylistPos);
					dojo.query('#video-list li').removeClass('selected');
					dojo.query('#video-list li:nth-child('+(window.app.aC.currentPlaylistPos+2)+')').addClass('selected');
					dojo.removeClass("control-list","inactive");
					window.app.yt.playVideo();
				} else {
					var cname = dojo.attr(this, "className").split(" ")[0];
					if (cname == "leftarrow") {
						if (window.app.aC.currentPlaylistPage > 1) {
							dojo.query('#video-list li').removeClass('selected');
							dojo.query('#video-list li:nth-child(2)').addClass('selected');
							--window.app.aC.currentPlaylistPage;
							window.app.displayVideos();
						}
					} else if (cname == "rightarrow") {
						if (window.app.aC.currentPlaylistPage < 5) {
							dojo.query('#video-list li').removeClass('selected');
							dojo.query('#video-list li:nth-child(2)').addClass('selected');
							++window.app.aC.currentPlaylistPage;
							window.app.displayVideos();
						}
					}
				}
			});
		});
		
		dojo.connect(window, "onkeydown", this, function(e){
			if (this.aC.currentPage == "main") {
				switch(e.keyCode){
					case dojo.keys.LEFT_ARROW:
					case dojo.keys.UP_ARROW:
						if (this.aC.videoSelected) { // do selected control
							dojo.addClass("control-list","inactive");
							this.controlList(id);
						} else {
							// play selected video or next page
							// switch to control list
							if (this.aC.currentPlaylistPos == 0) {
								--this.aC.currentPlaylistPage;
								this.displayVideos();
							} else if (this.aC.currentPlaylistPos == (this.aC.vThumbs + 2)) {
								++this.aC.currentPlaylistPage;
								this.displayVideos();
							} else {
								this.aC.videoSelected = true;
								dojo.removeClass("control-list","inactive");
								var vIndex = ((this.aC.currentPlaylistPage - 1) * this.aC.vThumbs) + this.aC.currentPlaylistPos;
								this.aC.currentVideoId = this.aC.playlistArr[vIndex].id;
								this.loadVideo(this.aC.currentVideoId);
								this.yt.playVideo();
							}
						}
					break;
					case dojo.keys.RIGHT_ARROW:
					case dojo.keys.DOWN_ARROW:
						if (this.aC.videoSelected) { // move to next item in control list
							if (++this.aC.currentMenuPos == 6) this.aC.currentMenuPos = 0;
							dojo.query('#control-list li').removeClass('selected');
							dojo.query('#control-list li:nth-child('+(this.aC.currentMenuPos+1)+')').addClass('selected');
						} else { // move to next video
							if (++this.aC.currentPlaylistPos == (this.aC.vThumbs + 2)) this.aC.currentPlaylistPos = 0;
							dojo.query('#video-list li').removeClass('selected');
							dojo.query('#video-list li:nth-child('+(this.aC.currentPlaylistPos+1)+')').addClass('selected');
						}
					break;
				}
			} else if (this.aC.currentPage == "splash") {
				switch(e.keyCode){
					case dojo.keys.ENTER:
						dojo.byId('b_search').click();
					break;
				}
			}
		});
	},
	showPage: function(id){
		if (id == this.aC.currentPage) return;
		this.aC.currentPage = id;
		dojo.query('.page').style({ display: "none" });
		dojo.style(id, { display: "block" });
	},
	loadPlayer: function(){
		var a = {allowScriptAccess: "always"};
		var b = {id: "ytplayer"};
		swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=ytplayer&key="+this.aC.devkey, "iVD", this.aC.playerWidth, this.aC.playerHeight, "8", null, null, a, b)
	},
	displayVideos: function(){
			var items = this.aC.playlistArr, ul = dojo.create("ul", {id:"video-list",className:"cf"}, "pW", "only"),
				typemap = {
					"Date": {
						deserialize: function(value){
							value = new Date(value);
							var month = value.getMonth(), date  = value.getDate();
							month = (month < 10) ? "0" + month : month;
							date  = (date  < 10) ? "0" + date : date;
							return value.getFullYear() + "-" + month + "-" + date;
						}
					}
				};
			dojo.create("li", {
				className: 'leftarrow',
				innerHTML: '<img src="i/larrow.png"/><div class="info">Back</div>'
			}, ul);
			var i = 0, begin = ((this.aC.currentPlaylistPage - 1) * this.aC.vThumbs), end = (this.aC.currentPlaylistPage * this.aC.vThumbs);
			for (i = begin; i < end; i++) {
				dojo.create("li", {
					id: items[i].id,
					innerHTML: '<img src="'+items[i].thumbnail.sqDefault+'"/><div class="info">'+items[i].title+'</div>'
				}, ul);
			}
			dojo.create("li", {
				className: 'rightarrow',
				innerHTML: '<img src="i/rarrow.png"/><div class="info">Next</div>'
			}, ul);
			dojo.query('#video-list li:nth-child(2)').addClass('selected');
			dojo.publish('/video-list/loaded');
	},
	getVideos: function(){
		var url = "http://gdata.youtube.com/feeds/api/videos";
		if (arguments[0] == "popular") url = "http://gdata.youtube.com/feeds/api/standardfeeds/top_favorites";
		return dojo.io.script.get({
			url: url,
			callbackParamName: "callback",
			content: {
				"q": this.aC.currentSearch,
				"max-results": this.aC.vThumbsMax,
				"v": 2,
				"alt": "jsonc"
			}
		}).then(function(result){
			var items = result.data.items;
			dojo.subscribe('/player/ready', dojo.hitch(app, function(){
				this.loadVideo(items[0].id);
				this.aC.currentVideoId = items[0].id;
				this.aC.playlistArr = items;
				this.displayVideos();
			}));
		});
	},
	handleDimensions: function(){
		var vs = dojo.window.getBox();
		this.aC.vThumbs = (Math.floor((vs.w - 20) / 140) - 2);
		this.aC.vThumbsMax = this.aC.vThumbsMaxPages * this.aC.vThumbs;
		this.aC.vs = vs;
	},
	loadVideo: function(id){
		if (ytplayer) {
			ytplayer.cueVideoById(id);
			this.aC.currentVideoId = id;
		}
	},
	goNextVideo: function(){
		if (this.aC.currentPlaylistPos == this.aC.vThumbs + 2) {
			this.aC.currentPlaylistPos = 1;
			this.aC.currentPlaylistPage++;
			this.displayVideos();
		}
		var vIndex = (this.aC.currentPlaylistPage * this.aC.vThumbs) + this.aC.currentPlaylistPos;
		this.aC.currentVideoId = this.aC.playlistArr[vIndex].id;
		this.loadVideo(this.aC.currentVideoId);
		this.yt.playVideo();
	},
	playPause: function(){
		if (ytplayer) {
			if (this.aC.playerState == 1) this.yt.pauseVideo();
			else if (this.aC.playerState == 2) this.yt.playVideo();
		}
	},
	yt: {
		playVideo: function(){
			if (ytplayer) ytplayer.playVideo();
		},
		pauseVideo: function(){
			if (ytplayer) ytplayer.pauseVideo();
		},
		clearVideo: function(){
			if (ytplayer) ytplayer.clearVideo();
		},
		setVolume: function(v){
			if (ytplayer) ytplayer.setVolume(v);
		},
		getDuration: function(){
			if (ytplayer) return ytplayer.getDuration();
		},
		getCurrentTime: function(){
			if (ytplayer) return ytplayer.getCurrentTime();
		},
		setSize: function(w, h){
			if (ytplayer) return ytplayer.setSize(w, h);
		},
		seekTo: function(s){
			if (ytplayer) return ytplayer.seekTo(s, false);
		}
	},
	controlList: function(id){
		console.log(id);
		switch(id){
			case "pause":
				
			break;
			case "change":
				this.aC.currentMenuPos = 0;
				this.aC.videoSelected = false;
				dojo.addClass("control-list","inactive");
			break;
			case "beginning":
				
			break;
			case "back":
				
			break;
			case "forward":
				
			break;
			case "related":
				
			break;
		}
	}
});

function onYouTubePlayerReady(a){
	ytplayer = dojo.byId(a);
	ytplayer.addEventListener("onStateChange", "onPlayerStateChange");
	ytplayer.addEventListener("onError", "onPlayerError");
	dojo.publish('/player/ready');
}

function onPlayerStateChange(a){
	window.app.aC.playerState = a;
	if (window.app.aC.playerState == 1) {
	} else if (window.app.aC.playerState == 0) {
		window.app.aC.goNextVideo();
	}
}

function onPlayerError(a){
	window.app.aC.goNextVideo();
	console.log("Error! oPE Type: " + a);
}