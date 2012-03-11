// Accessible YouTube

dojo.require('dojo.window');
dojo.require('dojo.io.script');

dojo.ready(function(){
	app = new youtube.Main();
});

dojo.declare('youtube.Main', null, {
	aC: {
		"title": "Accessible YouTube",
		"vThumbs": 5,
		"playerWidth": 720,
		"playerHeight": 405,
		"thumbHeight": 99,
		"currentPage": "splash",
		"currentSearch": "",
		"currentVideoId": "Vw4KVoEVcr0",
		"selectedVideoId": "",
		"currentPlaylistPage": 1,
		"currentPlaylistPos": 1,
		"selectedPlaylistPos": 1,
		"videoSelected": false,
		"playerState": -1,
		"playlistArr": {},
		"vs": {}
	},
	constructor: function(){
		this.handleScreenSize();
		this.loadPlayer();

		dojo.query('.home-link').connect('onclick', this, function(){
			this.showPage('splash');
		});

		dojo.connect(dojo.byId('most_popular-link'), 'onclick', this, function(){
			this.showPage('main');
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
			dojo.query('#video-list li').connect('onmouseenter', function(e){
				var vid = dojo.attr(this, "id"), index = -1;
				if (vid) {
					if (vid == app.aC.currentVideoId) return;
					if (!app.aC.videoSelected) app.loadVideo(vid);
					dojo.forEach(app.aC.playlistArr, function(v,i){
						if (index > -1) return;
						if (v.id == vid) index = i;
					});
					dojo.query('#video-list li').removeClass('selected');
					dojo.query('#video-list li:nth-child('+(index+2)+')').addClass('selected');
				} else {
					var cname = dojo.attr(this, "className");
					dojo.query('#video-list li').removeClass('selected');
					if (cname == "leftarrow") dojo.query('#video-list li:nth-child(1)').addClass('selected');
					else if (cname == "rightarrow") dojo.query('#video-list li:nth-child('+(app.aC.vThumbs+2)+')').addClass('selected');
				}
			}).connect('onclick', function(e){
				var vid = dojo.attr(this, "id");
				if (vid) {
					if (vid == app.aC.currentVideoId) return;
					app.loadVideo(vid);
					app.aC.videoSelected = true;
					dojo.removeClass("control-list","inactive");
				} else {
					var cname = dojo.attr(this, "className").split(" ")[0];
					if (cname == "leftarrow") {
						if (app.aC.currentPlaylistPage > 1) {
							alert("Back: Current Page = " + (--app.aC.currentPlaylistPage));
						}
					} else if (cname == "rightarrow") {
						if (app.aC.currentPlaylistPage < 5) {
							alert("Next: Current Page = " + (++app.aC.currentPlaylistPage));
						}
					}
				}
			});
		});
		
		dojo.connect(window, "onkeydown", this, function(e){
			switch(e.keyCode){
				case dojo.keys.LEFT_ARROW:
				case dojo.keys.UP_ARROW:
					if (this.aC.videoSelected) {
						// do selected control
						// if it's choose another movie
						// - deselect control list and switch to video selection
						console.log(e.target.id);
						
						dojo.addClass("control-list","inactive");
					} else {
						this.aC.videoSelected = true;
						dojo.removeClass("control-list","inactive");
						this.loadVideo(this.aC.selectedVideoId);
						this.aC.currentVideoId = this.aC.selectedVideoId;
						// play selected video
						// switch to control list
					}
				break;
				case dojo.keys.RIGHT_ARROW:
				case dojo.keys.DOWN_ARROW:
					if (this.aC.videoSelected) {
						// move to next item in control list
					} else {
						// move to next video
					}
				break;
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
		var a = {
			allowScriptAccess: "always"
		};
		var b = {
			id: "ytplayer",
			allowFullScreen: "true"
		};
		swfobject.embedSWF("http://www.youtube.com/v/" + this.aC.currentVideoId + "?version=3&enablejsapi=1&playerapiid=ytplayer&autoplay=0&fs=1&hd=0&showsearch=0&showinfo=1&iv_load_policy=3", "iVD", this.aC.playerWidth, this.aC.playerHeight, "8", null, null, a, b)
	},
	getVideos: function(){
		return dojo.io.script.get({
			url: "http://gdata.youtube.com/feeds/api/videos",
			callbackParamName: "callback",
			content: {
				"q": this.aC.currentSearch,
				"format": 5,
				"max-results": this.aC.vThumbs,
				"v": 2,
				"alt": "jsonc"
			}
		}).then(function(result){
			var items = result.data.items,
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
			dojo.subscribe('/player/ready', dojo.hitch(app, function(){
				this.loadVideo(items[0].id);
				this.aC.currentVideoId = items[0].id;
				this.aC.playlistArr = items;
			}));
			var ul = dojo.create("ul", {id:"video-list",className:"cf"}, "pW", "only");
			dojo.create("li", {
				className: 'leftarrow',
				innerHTML: '<img src="i/larrow.png"/><div class="info">Back</div>'
			}, ul);
			dojo.forEach(items, function(item){
				dojo.create("li", {
					id: item.id,
					innerHTML: '<img src="'+item.thumbnail.sqDefault+'"/><div class="info">'+item.title+'</div>'
				}, ul);
			});
			dojo.create("li", {
				className: 'rightarrow',
				innerHTML: '<img src="i/rarrow.png"/><div class="info">Next</div>'
			}, ul);
			dojo.query('#video-list li:nth-child(2)').addClass('selected');
			dojo.publish('/video-list/loaded');
				// typemap['Date'].deserialize(item.uploaded);
				/*
				item.thumbnail.sqDefault
				item.title
				item.description
				item.id
				item.uploaded
				item.viewCount
				item.duration
				
accessControl: Object
category: "Animals"
content: Object
description: "thanks to dailypicksandflicks.com for being the first to write about this video and to reddit.com for making it viral. And for all nice comments as well. :) lots of comments on video, cant read them all but a lot are spam and nasty - thats why they are now disabled, sorry."
duration: 61
favoriteCount: 163473
id: "Vw4KVoEVcr0"
likeCount: "262998"
player: Object
rating: 4.9169683
ratingCount: 268573
tags: Array[4]
thumbnail: Object
title: "Cat mom hugs baby kitten"
updated: "2012-01-20T17:12:13.000Z"
uploaded: "2011-05-26T16:31:13.000Z"
uploader: "dragomirnet86"
viewCount: 41506411
				*/
		});
	},
	goNextVideo: function(){
		if (this.aC.currentPlaylistPos == (this.aC.vThumbs - 1)) {
			this.goVid(0, this.aC.currentPlaylistPage);
			return;
		}
		this.goVid((this.aC.currentPlaylistPos + 1), this.aC.currentPlaylistPage);
	},
	goPrevVideo: function(){
		if (this.aC.currentPlaylistPos == 0) return;
		this.goVid((this.aC.currentPlaylistPos - 1), this.aC.currentPlaylistPage);
	},
	goVid: function(a, b){
		if (!this.aC.playlistShowing) return;
		if (b != this.aC.currentPlaylistPage) {
			this.aC.currentPlaylistPage = b;
			return;
		}
		this.loadAndPlayVideo(this.aC.playlistArr[b][a].id, a);
	},
	loadAndPlayVideo: function(a, b, c){
		if (this.aC.currentPlaylistPos == b) {
			this.aC.playPause();
			return;
		}
		if (ytplayer) {
			ytplayer.loadVideoById(a);
			this.aC.currentVideoId = a;
		}
		this.aC.currentPlaylistPos = b;
	},
	handleScreenSize: function(){
		var vs = dojo.window.getBox();
		this.aC.vThumbs = (Math.floor((vs.w - 20) / 140) - 2);
		this.aC.vs = vs;
	},
	loadVideo: function(id){
		if (ytplayer) {
			ytplayer.cueVideoById(id);
			this.aC.currentVideoId = id;
		}
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
		setVolume: function(){
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
		alert(id);
		switch(id){
			case "pause":
				
			break;
			case "change":
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
	app.aC.playerState = a;
	if (app.aC.playerState == 1) {
	} else if (app.aC.playerState == 0) {
		// app.aC.goNextVideo();
	}
}

function onPlayerError(a){
	app.aC.goNextVideo();
	console.log("Error! oPE Type: " + a);
}