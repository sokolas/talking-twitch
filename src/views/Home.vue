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
    <div v-for="message in messages" :key=message>
      <span><b>{{ message.name }} :</b> {{ message.text }}</span>
    </div>
    <hr>
    <form v-on:submit.prevent="onSubmit">
      <input type="file" v-on:change="fileChanged" id="file"/> <label for="file">file</label>
    </form>
  </div>
</template>

<script>
import { ref, toRef, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

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

    if (props.channel) {
      const channel = toRef(props, 'channel');
      name.value = channel.value;
      doConnect();
    }

    function save(user, voicesettings) {
      if (saveToStorage.value) {
        window.localStorage.setItem(user, JSON.stringify(voicesettings));
      } else {
        settings[user] = voicesettings;
      }
    }

    function load(user) {
      if (saveToStorage.value) {
        const item = window.localStorage.getItem(user);
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
      if (!talking.value) {
        return;
      }
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      if (voices.length == 0) {
        return;
      }
      const lastMessage = msgs[msgs.length - 1];
      const name = lastMessage.name;
      const text = lastMessage.text;
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
        console.log(files[0]);
        store.put(files[0], files[0].name);
      });
      conn.close();
    }

    return {
      name, connect, messages, saveToStorage, russian, fileChanged, talking
    }
  },

  name: 'Home'
}
</script>
