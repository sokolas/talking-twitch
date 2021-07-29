import { createStore } from 'vuex'
import tmi from 'tmi.js'

export default createStore({
	state: {
		voices: [],
		client: null,
		username: '',
		password: '',
		messages: [],
		error: null
	},
	mutations: {
		setClient(state, client) {
			state.client = client;
		},
		onMessage(state, message) {
			state.messages.push(message);
			if (state.messages.length > 5) {
				state.messages.shift();
			}
			// state.messages = state.messages.slice(-10);
		},
		setError(state, error) {
			state.error = error;
		}
	},
	actions: {
		connect(context, username) {
			if (context.state.client) {
				context.state.client.disconnect();
			}
			const client = new tmi.Client({
				options: { debug: true, messagesLogLevel: "info" },
				connection: {
					reconnect: true,
					secure: true
				},
				channels: [ username ]
			});
			client.on('message', (channel, tags, message, self) => {
				if (self) return;
				context.commit('onMessage', {name: tags['display-name'], text: message});
			});
			client.on('connecting', () => {
				context.commit('onMessage', {name: '###', text: 'connecting...'});
			});
			client.on('connected', () => {
				context.commit('onMessage', {name: '###', text: 'connected'});
			});
			client.on('disconnected', (reason) => {
				context.commit('onMessage', {name: '###', text: 'disconnected: ' + reason});
			})
			context.commit('setClient', client);
			client
				.connect()
				.then()
				.catch(e => {
					context.commit('setClient', null);
					context.commit('setError', e);
				});
			
		}
	},
	modules: {
	}
})
