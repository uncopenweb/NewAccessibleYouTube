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
		"currentPlaylistPage": 1,
		"currentPlaylistPos": 1,
		"currentMenuPos": 1,
		"currentPlayingPage": 0,
		"currentPlayingPos": 0,
		"videoSelected": false,
		"playerState": -1,
		"playlistArr": [],
		"vs": {},
		"ps": {
			"unstarted": -1,
			"ended": 0,
			"playing": 1,
			"paused": 2,
			"buffering": 3,
			"cued": 5
		},
		"controls": ["change","playpause","beginning","back","forward","related"],
		"settings": {
			"voice": 1
		}
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
				var obj = this;
				(dojo.hitch(app, function(){
					var vid = dojo.attr(obj, "id"), index = -1;
					if (vid) {
						if (vid == this.aC.currentVideoId) return;
						this.loadVideo(vid);
						this.aC.videoSelected = true;
						var i = 0, begin = ((this.aC.currentPlaylistPage - 1) * this.aC.vThumbs), end = (this.aC.currentPlaylistPage * this.aC.vThumbs);
						for (i = begin; i < end; i++) {
							if (index > -1) break;
							if (this.aC.playlistArr[i].id == vid) index = i;
						}
						this.aC.currentPlaylistPos = index+1;
						this.aC.currentPlayingPos = this.aC.currentPlaylistPos;
						this.aC.currentPlayingPage = this.aC.currentPlaylistPage;
						this.aC.currentMenuPos = 1;
						dojo.query('#video-list li').removeClass('selected nowplaying');
						dojo.query('#video-list li:nth-child('+(this.aC.currentPlaylistPos+1)+')').addClass('nowplaying');
						dojo.query('#control-list li').removeClass('selected');
						dojo.query('#control-list li:nth-child(1)').addClass('selected');
						dojo.removeClass("control-list","inactive");
						this.yt.playVideo();
					} else {
						var cname = dojo.attr(obj, "className").split(" ")[0];
						if (cname == "leftarrow") {
							if (this.aC.currentPlaylistPage > 1) {
								dojo.query('#video-list li').removeClass('selected');
								dojo.query('#video-list li:nth-child(2)').addClass('selected');
								--this.aC.currentPlaylistPage;
								this.displayVideos('back');
							}
						} else if (cname == "rightarrow") {
							if (this.aC.currentPlaylistPage < 5) {
								dojo.query('#video-list li').removeClass('selected');
								dojo.query('#video-list li:nth-child(2)').addClass('selected');
								++this.aC.currentPlaylistPage;
								this.displayVideos();
							}
						}
					}
				}))();
			});
		});
		
		dojo.connect(window, "onkeydown", this, function(e){
			if (this.aC.currentPage == "main") {
				switch(e.keyCode){
					case dojo.keys.LEFT_ARROW:
					case dojo.keys.UP_ARROW:
						if (this.aC.videoSelected) {
							var id = this.aC.controls[this.aC.currentMenuPos-1];
							this.controlList(id);
						} else {
							if (this.aC.currentPlaylistPos == 0) {
								if (this.aC.currentPlaylistPage > 1) {
									--this.aC.currentPlaylistPage;
									this.displayVideos('back');
								}
							} else if (this.aC.currentPlaylistPos == (this.aC.vThumbs + 1)) {
								if (this.aC.currentPlaylistPage < 5) {
									++this.aC.currentPlaylistPage;
									this.displayVideos();
								}
							} else {
								this.aC.videoSelected = true;
								dojo.query('#video-list li:nth-child('+(this.aC.currentPlaylistPos+1)+')').addClass('nowplaying');
								dojo.query('#video-list li').removeClass('selected');
								dojo.query('#control-list li:nth-child(1)').addClass('selected');
								dojo.removeClass("control-list","inactive");
								var vIndex = ((this.aC.currentPlaylistPage - 1) * this.aC.vThumbs) + (this.aC.currentPlaylistPos - 1);
								this.aC.currentVideoId = this.aC.playlistArr[vIndex].id;
								this.loadVideo(this.aC.currentVideoId);
								this.speech("Playing "+this.aC.playlistArr[vIndex].title);
								this.yt.playVideo();
							}
						}
					break;
					case dojo.keys.RIGHT_ARROW:
					case dojo.keys.DOWN_ARROW:
						if (this.aC.videoSelected) {
							if (this.aC.currentMenuPos++ == 6) this.aC.currentMenuPos = 1;
							dojo.query('#control-list li').removeClass('selected');
							dojo.query('#control-list li:nth-child('+(this.aC.currentMenuPos)+')').addClass('selected');
							if (playerState() == this.aC.ps.paused) {
								var text = "";
								dojo.query('#control-list li:nth-child('+(this.aC.currentMenuPos)+')').some(function(node){
									text = node.innerHTML;
								});
								this.speech(text);
							}
						} else {
							var lastPos = this.aC.vThumbs + 2;
							if (this.aC.currentPlaylistPage == this.aC.vThumbsMaxPages) lastPos = this.aC.vThumbs + 1;
							if (++this.aC.currentPlaylistPos == lastPos) {
								if (this.aC.currentPlaylistPage == 1) this.aC.currentPlaylistPos = 1;
								else this.aC.currentPlaylistPos = 0;
							}
							dojo.query('#video-list li').removeClass('selected');
							dojo.query('#video-list li:nth-child('+(this.aC.currentPlaylistPos+1)+')').addClass('selected');
							var vIndex = ((this.aC.currentPlaylistPage - 1) * this.aC.vThumbs) + (this.aC.currentPlaylistPos - 1);
							if (vIndex > -1) {
								this.aC.currentVideoId = this.aC.playlistArr[vIndex].id;
								this.loadVideo(this.aC.currentVideoId);
							}
							this.speech(this.aC.playlistArr[vIndex].title);
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
		if (arguments[0] == 'back') this.aC.currentPlaylistPos = 0;
		else this.aC.currentPlaylistPos = 1;
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
		if (this.aC.currentPlaylistPage == 1) leftClassName = " disabled";
		else leftClassName = "";
		dojo.create("li", {
			className: 'leftarrow'+leftClassName,
			innerHTML: '<img src="i/larrow.png"/><div class="info">Back</div>'
		}, ul);
		var i = 0, begin = ((this.aC.currentPlaylistPage - 1) * this.aC.vThumbs), end = (this.aC.currentPlaylistPage * this.aC.vThumbs);
		for (i = begin; i < end; i++) {
			dojo.create("li", {
				id: items[i].id,
				innerHTML: '<img src="'+items[i].thumbnail.sqDefault+'"/><div class="info" title="'+items[i].title+'">'+items[i].title+'</div>'
			}, ul);
		}
		if (this.aC.currentPlaylistPage == this.aC.vThumbsMaxPages) rightClassName = " disabled";
		else rightClassName = "";
		dojo.create("li", {
			className: 'rightarrow'+rightClassName,
			innerHTML: '<img src="i/rarrow.png"/><div class="info">Next</div>'
		}, ul);
		if (!this.aC.videoSelected) dojo.query('#video-list li:nth-child('+(this.aC.currentPlaylistPos+1)+')').addClass('selected');
		this.speech(items[begin].title);
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
		dojo.query('.page').style({
			height: vs.h - 57
		});
	},
	loadVideo: function(id){
		if (ytplayer) {
			ytplayer.cueVideoById(id);
			this.aC.currentVideoId = id;
		}
	},
	goNextVideo: function(){
		if (this.aC.currentPlaylistPos == (this.aC.vThumbs + 2)) {
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
			if (playerState() == this.aC.ps.playing) this.yt.pauseVideo();
			else if (playerState() == this.aC.ps.paused) this.yt.playVideo();
		}
	},
	yt: {
		playVideo: function(){
			if (ytplayer) ytplayer.playVideo();
		},
		pauseVideo: function(){
			if (ytplayer) ytplayer.pauseVideo();
		},
		stopVideo: function(){
			if (ytplayer) ytplayer.stopVideo();
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
		switch(id){
			case "playpause":
				if (ytplayer) {
					if (playerState() == this.aC.ps.playing) dojo.byId('playpause').innerHTML = 'Play';
					else if (playerState() == this.aC.ps.paused) dojo.byId('playpause').innerHTML = 'Pause';
				}
				this.playPause();
			break;
			case "change":
				this.aC.currentMenuPos = 1;
				this.aC.videoSelected = false;
				this.yt.stopVideo();
				dojo.addClass("control-list","inactive");
				dojo.query('#control-list li').removeClass('selected');
				dojo.query('#video-list li:nth-child('+(this.aC.currentPlaylistPos+1)+')').addClass('selected');
				dojo.query('#video-list li').removeClass('nowplaying');
			break;
			case "beginning":
				this.yt.seekTo(0);
			break;
			case "back":
				var currentTime = this.yt.getCurrentTime();
				if (currentTime > 10) this.yt.seekTo(currentTime - 10);
				else this.yt.seekTo(0);
			break;
			case "forward":
				var currentTime = this.yt.getCurrentTime(), duration = this.yt.getDuration();
				if (currentTime < (duration - 10)) this.yt.seekTo(currentTime + 10);
				else this.yt.seekTo(duration);
			break;
			case "related":
				
			break;
		}
	},
	speech: function(data){
		if (!this.aC.settings.voice) return;
		uow.getAudio().then(function(a){
			a.stop();
			a.setProperty({name: 'rate', value: 150});
			a.say({text: data.replace(/[^a-zA-Z0-9 ,.?]+/g,'')});
		});
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
	if (playerState() == window.app.aC.ps.playing) {
	} else if (playerState() == window.app.aC.ps.ended) {
		window.app.goNextVideo();
	}
}

function playerState(){
	return window.app.aC.playerState;
}

function onPlayerError(a){
	window.app.goNextVideo();
	console.log("Error! oPE Type: " + a);
}