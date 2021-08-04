<template>
  <router-view/>
  <div class="info">
    Entirely client-side TTS and sound commands tool for Twitch chat.
    Enable talking (done by your browser, tested in Firefox and Chrome) to listen to your chat in funny voices.
    Add your sounds and assign commands to activate them.
    If the commands don't trigger the sounds, make sure that you enabled the autoplay feature in your browser.
    <u>Remember, all the data is stored in your browser only so if you use another browser or another pc you'll have to configure everything from scratch.</u>
    <br>
    <div class="center">Made by Sokolas. <a href="https://github.com/sokolas/talking-twitch/issues" target="blank">Report a problem</a></div>
  </div>
</template>

<style>
  body {
    background-color:  #e6e2d3;
  }

  .info {
    border: 1px solid;
    border-color: #b9936c;
    border-radius: 3px;
    text-align: center;
    padding: 10px;
    margin: 50px;
  }

  .center {
    text-align: center;
  }

  a {
    color: #706250;
  }
</style>