const { axios } = require("axios")


exports.thirdPartyApiController = async (url, payload, username, password) => {
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