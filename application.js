document.addEventListener("DOMContentLoaded", function () {
  	var waitingInterval, userNumInterval;
  	var sockjs_url = 'http://2048.stolarsky.com:3000/game/sockets', sockjs, multiplexer;
  	
  	


  	// Wait till the browser is ready to render the game (avoids glitches)
 	window.requestAnimationFrame(function () {

 		/* Dialog Box */
	  	vex.defaultOptions.className = 'vex-theme-default';
	  	
	  	vex.dialog.open({
		    message: '2048 Online Oyununa hoşgeldiniz. <div>\n</div><strong>Nasıl Oynanır:</strong><ul><li>Sadece 2 dakikan var</li><li>Eğer zaman dolmadan hamleleleriniz biterse kaybedersiniz.</li><li>2048 puanına ulaştığınızda veya zaman dolduğunda en yüksek puanı olan kazanır.</li></ul> İyi şanslar OyunGAG başarılar diler.',
		    contentCSS: { width: '750px' },
		    buttons: [
		        $.extend({}, vex.dialog.buttons.NO, { className: 'vex-dialog-button-primary', text: 'Tweeter da paylaş', click: function($vexContent, event) {
		            $vexContent.data().vex.value = 'tweet-btn';
		            vex.close($vexContent.data().vex.id);
		        }}),
		        // $.extend({}, vex.dialog.buttons.NO, { className: 'vex-dialog-button-2048-friend', text: 'Play a Friend', click: function($vexContent, event) {
		        //     $vexContent.data().vex.value = '2048-friend';
		        //     vex.close($vexContent.data().vex.id);
		        // }}),
		        $.extend({}, vex.dialog.buttons.NO, { className: 'vex-dialog-button-2048-simple game-start-btn', text: 'Rakip Bul', click: function($vexContent, event) {
		            $vexContent.data().vex.value = '2048-simple';
		            vex.close($vexContent.data().vex.id);
		        }})
		    ],
		    callback: function(value) {
		        if (value === 'tweet-btn') {
		        	var tweetUrl = 'http://twitter.com/share?url=http%3A%2F%2Foyungag.com/2048-online&text=2048 Online Oyunu yarışmaya var mısın?!&via=oyungag';
		        	window.open(tweetUrl, '_blank').focus();
		        }
		    }
		});

	 	var startNewGame = function () {
	 		// $('#player-msg').addClass('text-center');
	 		$('.game-start-btn').on('click', function () {
				$('#player-msg').removeClass('text-center');
				$('#player-msg').html('<span style="float:left">Rakip aranıyor </span>\n<span class="ellipsis">.</span>\n<span class="ellipsis">.</span>\n<span class="ellipsis">.</span>');
				$('#game-stats').fadeIn();
				userNumInterval = setInterval(function () {
					$.get('http://2048.stolarsky.com:3000/game/players', function (data) {
						data = JSON.parse(data);
						$('#num-players').html('Oyuncu Sayısı: ' + data.numPlayers);
						$('#num-games').html('Oyun Sayısı: ' + data.numGames);
					});
				}, 1000);
				var fadedOut = false;
				waitingInterval = setInterval(function () {
				  if (fadedOut) {
				    $('.ellipsis:eq(0)').fadeIn(500);
				    setTimeout(function() {
				      $('.ellipsis:eq(1)').fadeIn(500);
				      setTimeout(function() {
				        $('.ellipsis:eq(2)').fadeIn(500);
				      }, 250);
				    }, 250);
				    fadedOut = false;
				  } 
				  else {
				    $('.ellipsis:eq(2)').fadeOut(500);
				    setTimeout(function() {
				      $('.ellipsis:eq(1)').fadeOut(500);
				      setTimeout(function() {
				        $('.ellipsis:eq(0)').fadeOut(500);
				      }, 250);
				    }, 250);
				    fadedOut = true;
				  }
				}, 1500);
				startGame();
			});
	 	};

		var startGame = function () {
		  	io = new SockJS(sockjs_url);
			window._io = {
				listeners: [],
				oneTimeListeners: [],
				addListener: function (cb) {
					window._io.listeners.push(cb);
				},
				addOneTimeListener: function (callback, onlyWhen) {
					window._io.oneTimeListeners.push({
						cb: callback,
						condition: onlyWhen
					});
				},
				clearListeners: function () {
					window._io.listeners = [];
					window._io.oneTimeListeners = [];
				}
			}

			io.onopen = function() {
				//console.log('sockjs: open');
			};

			io.onmessage = function(event) {
			    var msg = JSON.parse(event.data);
			    //console.log('message:', msg);
			    for (var i = 0, len = window._io.listeners.length; i < len; i++) {
			    	window._io.listeners[i](msg);
			    }
			    for (var i = window._io.oneTimeListeners.length - 1; i >= 0; i--) {
			    	var tempObj = window._io.oneTimeListeners[i];
			    	if (!!tempObj.condition(msg)) {
			    		tempObj.cb(msg);
			    		window._io.oneTimeListeners.splice(i, 1);
			    	}
			    }
			};

			/* Socket Listeners! */
			window._io.addListener(function (msg) {
			    if (msg.player && msg.size && msg.startCells) {
			    	window._gameBoard = {};
			    	window._gameBoard.size = msg.size;
			    	window._gameBoard.startTiles = msg.startCells;
			    	window._gameBoard.player = msg.player;
			    }
			});

			window._io.addOneTimeListener(function (msg) {
			    clearInterval(waitingInterval);
				clearInterval(userNumInterval);
				$('#player-msg').addClass('text-center');
			    $('#player-msg').html('Rakip Bulundu!');
			    $('#game-stats').fadeOut();
			    setTimeout(function () {
			    	window._io.player = {};
			    	window._io.player['1'] = 0;
			    	window._io.player['2'] = 0;
			    	window._io.gameOver = false;
				   	var opposingPlayer = window._gameBoard.player === 1 ? 2 : 1;
				    var times = 3;
				    var countdown = setInterval(function() {
						// Countdown messages
						$('#player-msg').removeClass('text-center');	
				   		$('#player-msg').html('<div style="text-align: center">Oyun Başlıyor <strong>' + times + '</strong></div>');
				   		times--;
				   		if (times === -1) {
				   			clearInterval(countdown);
				   			$('#player-msg').html('<div style="text-align: center"><strong> BAŞLA!</strong></div>');
				   			var localManager = new GameManager({size: window._gameBoard.size, startTiles: window._gameBoard.startTiles, player: window._gameBoard.player, otherPlayer: opposingPlayer, online: false}, KeyboardInputManager, HTMLActuator, io),
				    			onlineManager = new GameManager({size: window._gameBoard.size, startTiles: window._gameBoard.startTiles, player: opposingPlayer, otherPlayer: window._gameBoard.player, online: true}, OnlineInputManager, HTMLActuator, io);
				    		
				    		var gameOver = function (timer, message, connectionIssue) {
								message = message || 'Kaybetiniz!';
								clearInterval(timer);
								$('#player-msg').html('<div id="timer"><strong>' + message + '</strong></div>');
								window._io.gameOver = true;
								localManager.actuate();
								onlineManager.actuate();
								setTimeout(function () {
									$('#player-msg').fadeOut();
								}, 1000);
								setTimeout(function () {
									$('#player-msg').html('');
									$('#player-msg').fadeIn();
								}, 1500);
								setTimeout(function () {
									$('#player-msg').html('<a id="" class="btn game-start-btn">Rakip Bul!</a>');
									startNewGame();
									window._io.clearListeners();
									io.close();
									$('.game-start-btn').on('click', function () {
										localManager.restart();
										onlineManager.restart();
									});
								}, 3000);
							};

				   			var gameTimeLeft = 120;//game timer
				   			var timer = setInterval(function () {
								var sec; 
	    						if (gameTimeLeft % 60 === 0)
	    							sec = '00';
	    						else if (('' + gameTimeLeft % 60).length === 1)
	    							sec = '0' + gameTimeLeft % 60;
	    						else
	    						 	sec = gameTimeLeft % 60;
	      						var min = Math.floor(gameTimeLeft/60);
				   				$('#player-msg').html('<div id="timer"><strong>' + min + ':' + sec + '</strong></div>');
				   				gameTimeLeft--;
				   				if (gameTimeLeft === -1) {
				   					gameOver(timer);
				   				}
				   			}, 750);
				   			
				   			window._io.addOneTimeListener(function (msg) {
							  	gameOver(timer);
							}, function (msg) {
								return !!msg.gameEnd;
							});
							// window._io.addOneTimeListener(function (msg) {
							//   	// console.log('msg sent was dead');
							//   	gameOver(timer, 'Connection Lost :(');
							// }, function (msg) {
							// 	return !!msg.dead;
							// });
				   		}
				   	}, 1000);
			    }, 1000);
			}, function (msg) {
				return !!msg.start;
			});
			
			io.onclose = function() {
			    //console.log('sockjs: close');
			};
		};

		startNewGame();
  });
});
