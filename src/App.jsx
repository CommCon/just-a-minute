import React, { Component } from 'react';
import './App.css';
import logo from './buzzer.jpg';
import './buzz/Controller'
import './buzz/Controller.layouts.min';
import BuzzController from './buzz/BuzzController';
// import buzzBuzzers from 'buzz-buzzers';
import ReactCountdownClock from 'react-countdown-clock';
import {Howl, Howler} from 'howler';
// import Launchpad from "launchpad-mk2";
import questions from './questions';
import players from './players';
import * as audio from './audio';
import Launchpad from 'launchpad-webmidi';
// includeLayout(Controller);

// console.log(audio)

const endSound = new Howl({
  src: [audio.end]
});

const buzzSound = new Howl({
  src: [audio.buzz]
});

const themeSound = new Howl({
  src: [audio.theme]
});

class App extends Component {
  constructor(props) {
    super(props);

    this.buzzers = null;
    this.timerPaused = true;
    this._timerCompleted = false;

    this.state = {
      playersSet: false,
      playerNames: players,
      players: {
        0: players[0],
        1: players[1],
        2: players[2],
        3: players[3]
      },
      playersScore: {
        0: 0,
        1: 0,
        2: 0,
        3: 0
      },
      questions: questions,
      started: false,
      playerAnsweringQuestion: null,
      playerPaused: null,
      connected: false,
      seconds: 60,
      completions: 0,
      allowAcceptDecline: false,
      declined: false,
    };

    this.connectToLaunchPad();

    document.addEventListener('keydown', (event) => {

      const keyName = event.key;

      if (!this.state.playersSet) {
        return;
      }

      if (keyName === 't') {
        this.togglePlayingTheme();
      }
      else if (this.state.completions === 0 && ['1', '2', '3', '4'].indexOf(keyName) !== -1) {
        //select the player
        this.setStartingPlayer(keyName - 1)
      }
      else if (keyName === 'a' && this.timerPaused && this.state.allowAcceptDecline) {
        this.acceptInterjection();
      }
      else if ((keyName === 'd' || keyName === 'r') && this.timerPaused && this.state.allowAcceptDecline) {
        this.declineInterjection();
      }
      else if (keyName === 's') {
        this.startGame();
      }
    }, false);

    window.addEventListener('gc.controller.found', (event) => {
      var controller = event.detail.controller;
      console.log("Controller found at index " + controller.index + ".");
      console.log("'" + controller.name + "' is ready!");
      this._buzzersConnected(event);
    }, false);
  }

  async connectToLaunchPad() {
    try {
      if (this.pad) {
        return;
      }
      this.pad = new Launchpad();
      await this.pad.connect();
      console.log('Launchpad connected')
      this.pad.brightness(1);

      this.pad.on('key', k => {
          console.log(`Key ${k.x},${k.y} down: ${k.pressed}`);
          // Make button red while pressed, green after pressing
          this.pad.col(k.pressed ? this.pad.red : this.pad.green, k);
      });

      // myLaunchpad.darkAll();

      // myLaunchpad.on("press", pressInfo => {
      //   console.log(pressInfo.button.note);

      //   if (!this.state.playersSet) {
      //     return;
      //   }

      //   switch(pressInfo.button.note) {
      //     case 88:
      //       this.togglePlayingEnd();
      //       break;
      //     case 68:
      //       this.togglePlayingTheme();
      //       break;
      //     case 48:
      //       this.togglePlayingBuzzer();
      //       break;
      //     case 81:
      //       this.setStartingPlayer(0)
      //       break;
      //     case 82:
      //       this.setStartingPlayer(1)
      //       break;
      //     case 83:
      //       this.setStartingPlayer(3)
      //       break;
      //     case 84:
      //       this.setStartingPlayer(4)
      //       break;
      //     case 61:
      //       if (this.timerPaused && this.state.allowAcceptDecline) {
      //         this.acceptInterjection();
      //       }
      //       break;
      //     case 62:
      //       if (this.timerPaused && this.state.allowAcceptDecline) {
      //         this.declineInterjection();
      //       }
      //       break;
      //     case 63:
      //       this.startGame();
      //       break;
      //   }
      // })
    } catch(err) {
      console.error('caught error:', err)
    }
  }

  setStartingPlayer(number) {
    if (this.state.completions === 0) {
      console.log('setting starting player', number)
      this.setState({playerAnsweringQuestion: number});
    }
  }

  startGame() {
    console.log('attempting to start game')
    if (typeof this.state.playerAnsweringQuestion !== 'number') {
      return;
    }
    console.log('we have a player selected to start', this.state.playerAnsweringQuestion);

    this._lightController([0,0,0,0]);

    if (this._timerCompleted) {
      //restart it
      this._restart();
    }else {
      this.timerPaused = false;
      this.setState({playerPaused: null, started: true, declined: false, accepted: false})
    }
  }

  declineInterjection() {
    console.log('player answering question:', this.state.playerAnsweringQuestion);
    console.log('play score:', this.state.playersScore[this.state.playerAnsweringQuestion]);
    this.setState({
      declined: true,
      allowAcceptDecline: false,
      playersScore: Object.assign({}, this.state.playersScore, {[this.state.playerAnsweringQuestion]: this.state.playersScore[this.state.playerAnsweringQuestion]+1})});
  }

  acceptInterjection() {
    this.setState({
      accepted: true,
      allowAcceptDecline: false,
      playerAnsweringQuestion: this.state.playerPaused,
      playersScore: Object.assign({}, this.state.playersScore, {[this.state.playerPaused]: this.state.playersScore[this.state.playerPaused]+1})});
  }

  togglePlayingEnd() {
    if (endSound.playing()) {
      endSound.stop()
    } else {
      endSound.play();
    }
  }

  togglePlayingTheme() {
    if (themeSound.playing()) {
      themeSound.stop()
    } else {
      themeSound.play();
    }
  }

  togglePlayingBuzzer() {
    if (buzzSound.playing()) {
      buzzSound.stop()
    } else {
      buzzSound.play();
    }
  }

  _restart() {
    this._timerCompleted = false;
    this.setState({seconds: 60, started: true});
  }

  _pause(controllerNumber) {
    console.log('attempting to pause by controller', controllerNumber)
    if (!this.state.started) {
      return;
    }
    console.log('game has started so continuing')

    if(this.state.playerAnsweringQuestion === (controllerNumber - 1)) {
      return;
    }

    if (this.state.playerPaused) {
      return;
    }

    console.log('buzzer isn\'t the player whos answering')

    console.log('pausing controller number', controllerNumber);

    buzzSound.play();

    this.timerPaused = true;
    this.setState({
      playerPaused: controllerNumber - 1,
      allowAcceptDecline: true
    });
    let arr = [];
    for(let f = 1; f <= 4; f++) {
      arr.push(f === controllerNumber ? 1 : 0);
    }
    this._lightController(arr)
  }

  _setCompleted() {
    endSound.play();
    this.timerPaused = true;
    this._timerCompleted = true;
    this.setState({completions:  this.state.completions + 1, playersScore: Object.assign({}, this.state.playersScore, {[this.state.playerAnsweringQuestion]: this.state.playersScore[this.state.playerAnsweringQuestion]+1})})
    this._restart();
  }

  _buzzerPress(ev) {
    // ev is an object with two attributes:
    // - controller: Number from 1 to 4
    // - button: Number from 0 to 4. 0 is the big red button.
    console.log(`Button ${ev.detail.name} pressed`);
    this._pause(ev.detail.name.substr(1,1)/1);
  }

  _buzzerRelease(ev) {
    //console.log(ev);
    //console.log(`Button ${ev.detail.name} released`);
  }

  _lightController(arr) {
    let state = parseInt(arr.join(''), 2);
    BuzzController.lights = state;
  }

  _buzzersConnected(event) {
    this.setState({connected: true});
    // Get notified when a button is pressed
    this.controller = event.detail.controller;
    this._lightController([1,1,1,1]);
    window.addEventListener('gc.button.press', this._buzzerPress.bind(this), false);
    // window.addEventListener('gc.button.hold', updateButton, false);
    window.addEventListener('gc.button.release', this._buzzerRelease.bind(this), false);
    // window.addEventListener('gc.analog.change', updateAnalog, false);

    // Controller events
    // window.addEventListener('gc.controller.found', showControllerTables, false);
    // window.addEventListener('gc.controller.lost', destroyTable, false);

    // Get notified whenever something changes
    // this.buzzers.onChange((state) => {
    //   // state is an array of booleans with all buttons
    //   // false means the button is not pressed
    //   // and true when a button is pressed
    //   /* An example could look like this, in this case the second color button
    //   of controller 2 was pressed and the big red button on controller four is pressed
    //   [
    //         false, false, false, false, false, // first controller
    //         false, false, true, false, false, // second controller
    //         false, false, false, false, false, // third controller
    //         true, false, false, false, false // fourth controller
    //     ]
    //   */
    // });

    // Get notified when an error happens
    // this.buzzers.onError((err) => {
    //   console.log('Error: ', err);
    //   if (err.message === 'could not read from HID device') {
    //     this.setState({connected: false});
    //     this._connect();
    //   }
    // });

    // // Remove event listeners
    // // To remove a listener just call removeEventListener
    // // possible first parameter values are: press, release, change, error
    // buzzers.removeEventListener('press', callback);


    // Make a buzzer light up
    // this only works on the buzzers with an LED
    // this.buzzers.setLeds(true, false, false, false); // light up controller number 1
    // this.buzzers.setLeds(true, true, false, true); // light up all controllers except for number 3
  }



  _connect() {
    console.log('attempting connect');
    try {
      this.buzzers = BuzzController.search(); // initialize buzzers
    } catch (err) {
      console.log('ERROR', err);
      setTimeout(() => {
        this._connect();
      }, 1000)
    }
  }

  componentDidMount() {
    this._connect();
  }

  _handlePlayerNameChange(name) {
    return (event) => {
      let state = Object.assign(this.state, {
        players: Object.assign(this.state.players, { [name]: event.target.value}),
      });
      console.log(state);
      this.setState(state);
    };
  }

  _countdownRenderer({ hours, minutes, seconds, milliseconds, completed }) {
    if (completed) {
      // Render a completed state
      return <span>00</span>;
    } else {
      // Render a countdown
      if (minutes === 1) {
        return <span>60</span>;
      }

      if (seconds <= 10) {
        return <span>{seconds}.{milliseconds}</span>;
      }

      if (seconds === 0) {
        return <span>0</span>;
      }

      return <span>{seconds}</span>;
    }
  };

  render() {

    if (!this.state.connected) {
      return (
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <p>
              Plug in the Buzzer USB Stick
            </p>
          </header>
        </div>
      );
    }

    if (!this.state.playersSet) {
      return (
        <div className="App">
          <header className="App-header">
            Please enter player names
            <form noValidate autoComplete="off">
              <input type='text' label='Player 1' value={this.state.playerNames[0]} onChange={this._handlePlayerNameChange(0)} />
              <input type='text' label='Player 2' value={this.state.playerNames[1]} onChange={this._handlePlayerNameChange(1)} />
              <input type='text' label='Player 3' value={this.state.playerNames[2]} onChange={this._handlePlayerNameChange(2)} />
              <input type='text' label='Player 4' value={this.state.playerNames[3]} onChange={this._handlePlayerNameChange(3)} />

              <button onClick={() => {this.setState({playersSet: true})}}>Let's Play Just a Minute!</button>
            </form>
          </header>
        </div>
      );
    }

    let players = Object.keys(this.state.players).map((key) => {
      return (
        <div className={`player ${(this.state.playerPaused == key ? 'requestedPause' : '')} ${this.state.declined ? 'declined': ''} ${this.state.accepted ? 'accepted': ''}`}>
          <h1 className="playerScore">{this.state.playersScore[key]}</h1>
          <h2 className="playerName">{this.state.players[key]}</h2>
        </div>
      );
    })

    this.countdownRef = React.createRef();

    return (
      <div className="App">
        <header className="App-header">
          <div className="topHalf">
            <div className="countdown">
              <ReactCountdownClock key={this.state.completions} paused={this.timerPaused} seconds={this.state.seconds}
                      color="#fff"
                      alpha={0.9}
                      size={350}
                      timeFormat="s"
                      onComplete={this._setCompleted.bind(this)}
                        />
            </div>
            <p className="question">
              {this.state.questions[this.state.completions]}
            </p>
          </div>
          <div className="players">
            {players}
          </div>
        </header>
      </div>
    );
  }
}

export default App;
