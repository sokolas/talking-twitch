<template>
  <div class="home">
    <!-- Please go <a href="https://twitchapps.com/tmi/" target="blank">here</a>, generate and copy the token -->
    <div>
      <form v-on:submit.prevent="onSubmit">
        <input type="text" placeholder="channel" id="username" v-model="name"/>
        <input type="submit" v-on:click="connect" value="Connect" /><br>
        <input type="checkbox" v-model="talking" id="talking"/> <label for="talking">enable talking</label><br>
        <input type="checkbox" v-model="saveToStorage" id="savetostore"/> <label for="savetostore">save voice for users</label><br>
        <input type="checkbox" v-model="russian" id="russian"/> <label for="russian">Russian for all</label>
      </form>
    </div>
    <hr>
    <form v-on:submit.prevent="onSubmit">
      <input type="file" v-on:change="fileChanged" id="file"/> <label for="file">Save sound</label>
    </form>
    <div v-for="(file, index) in soundFiles" :key="index">
      <audio :src="file.url" :id="file.uuid" :ref="el => audios[file.uuid] = el" />{{ file.name }}&nbsp;
        <button :id="file.uuid" v-on:click="playSound">&gt;</button>
        <button :id="file.uuid" v-on:click="deleteSound">X</button>
    </div>
    <hr>
    <div>
      <form v-on:submit.prevent="addCommand">
        <input type="text" placeholder="!command" id="command" v-model="command"/>
        <input type="submit" value="Set" /><br>
      </form>
      <div v-for="(value, index) in soundCommands" :key="index">
        {{value.name}}
        <select v-on:change="setSound" :id="value.uuid">
          <option value="">---</option>
          <template v-for="(file, fileindex) in soundFiles" :key="fileindex">
            <option :value="file.uuid" :selected="file.uuid === value.soundId">{{file.name}}</option>
          </template>
        </select>
        <button :id="value.uuid" v-on:click="deleteCommand">X</button>
      </div>
    </div>
    <hr>
    <div v-for="message in messages" :key=message>
      <span><b>{{ message.name }} :</b> {{ message.text }}</span>
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

        store.put({file: file, uuid: v4()}, file.name);
        const index = soundFiles.value.findIndex(f => f.name === file.name);
        if (index > -1) {
          soundFiles.value.splice(index, 1);
        }
        soundFiles.value.push({
          name: file.name,
          url: URL.createObjectURL(file),
          uuid: file.uuid
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

    function deleteCommand(e) {
      const id = e.target.id;
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

    async function deleteSound(e) {
      const id = e.target.id;
      const index = soundFiles.value.findIndex((item) => item.uuid === id);

      if (index > -1) {
        await deleteFile(soundFiles.value[index].name);
        soundFiles.value.splice(index, 1);
      }
    }

    function setSound(e) {
      const commandId = e.target.id;
      const soundId = e.target.value;
      const index = soundCommands.value.findIndex((item) => item.uuid === commandId);
      if (index > -1) {
        soundCommands.value[index].soundId = soundId;
        window.localStorage.setItem('soundCommands', JSON.stringify(soundCommands.value));
      }
    }

    function playSound(e) {
      const soundId = typeof e === 'string' ? e : e.target.id;
      audios.value[soundId].play();
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
