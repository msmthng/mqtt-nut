const { connect } = require('mqtt');
const { config } = require('./config');
const { version } = require('./package');

const { Platform } = require('./platform');

//var names = JSON.parse(config.nut.names);
//var topicname = 




const topics = {
	state: () => `${config.mqtt.path}/state`,
        update: ({ name }, topic) => `${config.mqtt.path}/${name}/${topic}`,
};


const format = (type, args) => [
	`[${type.toUpperCase()}]`,
	...args,
].join(' ');

const log = (type, ...args) => console.log(format(type, args));

const error = (type, ...args) => console.error(format(type, args));

const mqtt = connect(config.mqtt.host, {
	username: config.mqtt.username,
	password: config.mqtt.password,
	clientId: config.mqtt.id,
	will: {
		topic: topics.state(),
		payload: JSON.stringify({ online: false }),
		retain: true,
	},
});

const nut = new Platform(config.nut);

nut.on('status', (online) => {
	log('nut', `connected to ${config.nut.host}`);

	mqtt.publish(topics.state(), JSON.stringify({
		online,
		version,
		host: config.nut.host,
	}), {
		retain: true,
	});
});

nut.on('error', (e) => {
	error('nut', 'error');
	error('nut', `  > ${e.toString()}`);
});

nut.on('update', (device, topic, data) => {
	if (topic === 'info') {
		log('nut', `${device.name}`);
		log('nut', `  > ${JSON.stringify(data)}`);
	}

        var name = device.name;

        if (config.nut.name != '')  device.name = config.nut.name;

	mqtt.publish(topics.update(device, topic), JSON.stringify(data), {
		retain: true,
	});

        device.name = name;

});

mqtt.on('connect', () => log('mqtt', `connected to ${config.mqtt.host}`));

mqtt.on('error', (e) => {
	error('mqtt', 'connection error');
	error('mqtt', `  > ${e.toString()}`);

	// exiting in case of error so
	// supervisor can restart it
	process.exit(1);
});
