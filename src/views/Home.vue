<template>
  <!-- <h2>Enable audio autoplay!</h2> -->
  <div class="main">
    <!-- Please go <a href="https://twitchapps.com/tmi/" target="blank">here</a>, generate and copy the token -->
    <div class="vertical">
      <h2>Channel and speech</h2><hr>
      <form v-on:submit.prevent="onSubmit">
        <input type="text" placeholder="channel" id="username" v-model="name"/>
        <button type="submit" v-on:click="connect"><font-awesome-icon icon="sign-in-alt"></font-awesome-icon></button><br>
        <input type="checkbox" v-model="talking" id="talking"/> <label for="talking">enable talking</label><br>
        <input type="checkbox" v-model="saveToStorage" id="savetostore"/> <label for="savetostore">save voice for users</label><br>
        <input type="checkbox" v-model="russian" id="russian"/> <label for="russian">Russian for all</label>
      </form>
    </div>
    <hr>
    <div  class="vertical">
      <h2>Chat</h2><hr>
      <div v-for="message in messages" :key=message>
        <span><b>{{ message.name }} :</b> {{ message.text }}</span>
      </div>
    </div>
    <hr>
    <div  class="vertical">
      <h2>Sounds</h2><hr>
      <form v-on:submit.prevent="onSubmit">
        <input id="file-upload" type="file" v-on:change="fileChanged" />
        <label for="file-upload" class="custom-file-upload" style="padding-left: 3px; padding-right: 3px;">Select a file</label>
      </form>
      <div class="horizontal" v-for="(file) in soundFiles" :key="file.uuid">
        <audio :src="file.url" :ref="el => {if (el) audios[file.uuid] = el}" />{{ file.name }}&nbsp;
        <button v-on:click="playSound(file.uuid)"><font-awesome-icon icon="play"></font-awesome-icon></button>
        <button v-on:click="deleteSound(file.uuid)"><font-awesome-icon icon="trash-alt"></font-awesome-icon></button>
      </div>
    </div>
    <hr>
    <div class="vertical">
      <h2>Commands</h2><hr>
      <form v-on:submit.prevent="addCommand">
        <input type="text" placeholder="!command" id="command" v-model="command"/>
        <button type="submit"><font-awesome-icon icon="plus"></font-awesome-icon></button><br>
      </form>
      <div class="horizontal" v-for="(value) in soundCommands" :key="value.uuid">
        {{value.name}}
        <select v-on:change="setSound(value.uuid, $event)">
          <option value="">---</option>
          <template v-for="(file) in soundFiles" :key="file.uuid">
            <option :value="file.uuid" :selected="file.uuid === value.soundId">{{file.name}}</option>
          </template>
        </select>
        <button :id="value.uuid" v-on:click="deleteCommand(value.uuid)"><font-awesome-icon icon="trash-alt"></font-awesome-icon></button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, toRef, computed, watch, onBeforeUpdate } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import * as v4 from 'uuid/v4';

export default {
  props: {
    channel: String
  },

  setup(props) {
    const dbversion = 1;
    const name = ref("");
    const store = useStore();
    const router = useRouter();

    function connect() {
      router.push({path: '/' + name.value});
      doConnect();
    }
    
    function doConnect() {
      store.dispatch('connect', name.value);
    }

    const settings = {};
    const saveToStorage = ref(false);
    const russian = ref(false);
    const talking = ref(false);
    const soundCommands = ref(JSON.parse(window.localStorage.getItem('soundCommands')) || []);
    const soundFiles = ref([]);
    const audios = ref([]);
    const audioOnCommands = ref([]);
    const command = ref("");

    onBeforeUpdate (() => {
      audios.value = [];
      audioOnCommands.value = [];
    }) 

    if (props.channel) {
      const channel = toRef(props, 'channel');
      name.value = channel.value;
      doConnect();
    }

    function save(user, voicesettings) {
      if (saveToStorage.value) {
        window.localStorage.setItem('user:' + user, JSON.stringify(voicesettings));
      } else {
        settings[user] = voicesettings;
      }
    }

    function load(user) {
      if (saveToStorage.value) {
        const item = window.localStorage.getItem('user:' + user);
        if (item) {
          return JSON.parse(item);
        } else {
          return null;
        }
      } else {
        return settings[user];
      }
    }
    
    watch(store.state.messages, (msgs) => {
      const lastMessage = msgs[msgs.length - 1];
      const name = lastMessage.name;
      const text = lastMessage.text;
      let talk = talking.value;
      
      const index = soundCommands.value.findIndex(c => text.startsWith(c.name));
      if (index > -1) {
        talk = false;
        playSound(soundCommands.value[index].soundId);
      }

      if (!talk) {
        return;
      }
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      if (voices.length == 0) {
        return;
      }
      console.log(name);
      console.log(text);
      if (name !== '###') {
        let voiceSettings = load(name);
        if (!voiceSettings) {
          const i = Math.floor(Math.random() * voices.length);
          const voice = voices[i];
          const pitch = 2 * Math.random();
          const rate = 5 * Math.random();
          voiceSettings = {name: voice.name, pitch: pitch, rate: rate, lang: voice.lang};
          save(name, voiceSettings);
        }
        console.log(JSON.stringify(voiceSettings));
        const voice = voices.find(v => v.name === voiceSettings.name);
        if (voice) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = russian.value ? 'ru-RU' : voiceSettings.lang;
          u.pitch = voiceSettings.pitch;
          // u.rate = voiceSettings.rate;
          synth.speak(u);
        }
      }
    });
    const messages = computed(() => store.state.messages);

    function onupgradeneeded(event) {
      const conn = event.target.result;
      conn.createObjectStore('sounds');
    }

    function openDb(name) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, dbversion);
        request.onupgradeneeded = onupgradeneeded;
        request.onsuccess = () => {
          console.log('success');
          resolve(request.result);
        }
        request.onerror = () => {
          console.log('error');
          reject(request.error);
        }
      });
    }

    async function fileChanged(event) {
      const files = event.target.files;

      const conn = await openDb('talking');
      await new Promise((resolve, reject) => {
        const tx = conn.transaction('sounds', 'readwrite');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error('file storage error'));

        const store = tx.objectStore('sounds');
        const file = files[0];
        const uuid = v4();
        store.put({file, uuid}, file.name);
        const index = soundFiles.value.findIndex(f => f.name === file.name);
        if (index > -1) {
          soundFiles.value.splice(index, 1);
        }
        soundFiles.value.push({
          name: file.name,
          url: URL.createObjectURL(file),
          uuid: uuid
        });
      });
      conn.close();
    }

    async function loadSounds() {
      const conn = await openDb('talking');
      const items = await new Promise((resolve, reject) => {
        const result = conn.transaction(['sounds'], "readonly");
        result.onerror = reject;
        const getall = result.objectStore('sounds').getAll();
        getall.onsuccess = (event) => resolve(event.target.result);
        getall.onerror = reject;
      });
      // console.log(tx);
      const URL = window.URL;
      for (const i in items) {
        const item = items[i];
        soundFiles.value.push({
          name: item.file.name,
          url: URL.createObjectURL(item.file),
          uuid: item.uuid
        });
      }
      conn.close();
    }

    function addCommand() {
      const uuid = v4();
      soundCommands.value.push({uuid: uuid, name: command.value});
      command.value = "";
      window.localStorage.setItem('soundCommands', JSON.stringify(soundCommands.value));
    }

    function deleteCommand(id) {
      const index = soundCommands.value.findIndex((item) => item.uuid === id);

      if (index > -1) {
        soundCommands.value.splice(index, 1);
        window.localStorage.setItem('soundCommands', JSON.stringify(soundCommands.value));
      }
    }

    async function deleteFile(name) {
      const conn = await openDb('talking');
      await new Promise((resolve, reject) => {
        const tx = conn.transaction('sounds', 'readwrite');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error('file storage error'));

        const store = tx.objectStore('sounds');
        store.delete(name);
      });
      conn.close();
    }

    async function deleteSound(id) {
      const index = soundFiles.value.findIndex((item) => item.uuid === id);

      if (index > -1) {
        await deleteFile(soundFiles.value[index].name);
        soundFiles.value.splice(index, 1);
      }
    }

    function setSound(commandId, e) {
      const soundId = e.target.value;
      const index = soundCommands.value.findIndex((item) => item.uuid === commandId);
      if (index > -1) {
        soundCommands.value[index].soundId = soundId;
        window.localStorage.setItem('soundCommands', JSON.stringify(soundCommands.value));
      }
    }

    function playSound(soundId) {
      if (audios.value[soundId]) {
        audios.value[soundId].play();
      }
    }

    loadSounds();

    return {
      name, connect, messages, saveToStorage, russian, fileChanged, talking, soundCommands, soundFiles, audios, command, 
      addCommand, deleteCommand, setSound, deleteSound, playSound
    }
  },

  name: 'Home'
}
</script>

<style scoped>
  .main {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }

  .vertical {
    margin-top: 20px;
    flex-direction: column;
    width: 250px;
    max-width: 250px;
  }

  .horizontal {
    margin-top: 5px;
  }

  h2 {
    margin-top: 5px;
    margin-bottom: 5px;
    text-align: center;
  }

  hr {
    margin: 5px;
    color: #b9936c;
  }

  button {
    background-color: #dac292;
    color: #706250;
    border: 1px solid;
    border-color: #b9936c;
    border-radius: 3px;
    margin-left: 3px;
  }

  input[type=submit] {
    background-color: #dac292;
    border: 1px solid;
    border-color: #b9936c;
    border-radius: 3px;
    margin-left: 3px;
  }

  .custom-file-upload {
    background-color: #dac292;
    border: 1px solid;
    border-color: #b9936c;
    border-radius: 3px;
    margin-left: 3px;
  }

  input[type=text] {
    border: 1px solid;
    border-color: #b9936c;
    border-radius: 3px;
  }

  select {
    border: 1px solid;
    border-color: #b9936c;
    border-radius: 3px;
  }

  input[type=file] {
    display: none;
  }


</style>