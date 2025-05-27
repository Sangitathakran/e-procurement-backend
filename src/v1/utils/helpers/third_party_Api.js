const { default: axios } = require("axios");


exports.thirdPartyPostApi = async (url, payload, username, password) => {
    try {
        const response = await axios.post(url, payload, {
            auth: {
                username: username,
                password: password
            }
        })
        return response
    } catch (error) {
        return error
    }
}

exports.thirdPartyGetApi = async (url, params, username, password) => {
    try {
        const response = await axios.get(url, {
            params: params,  // Passing the query parameters
            auth: {
                username: username,
                password: password
            }
        });
        return response.data && response.data[0] ? response.data[0] : null;
    } catch (error) {
        console.log(error)
        return error;
    }
};
