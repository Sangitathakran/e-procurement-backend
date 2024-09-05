module.exports = {
    _auth_module: {
        created: (name) => `${name || "Account"} created successfully.`,
        login: (name) => `${name || "Account"} login successfully.`,
        allReadyExist: (key) => `${key || "Data"} already exist.`,
        unAuth: "Unauthorized access.",
        tokenMissing: "Token missing, Please login again.",
        tokenExpired: "Token Expired, Please login again."
    },
    _middleware: {
        require: (name) => `${name} is required.`
    },
    _query: {
        add: (key) => `${key || "Record"} add successfully.`,
        get: (key) => `${key || "Record"} fetched successfully.`,
        update: (key) => `${key || "Record"} update successfully.`,
        delete: (key) => `${key || "Record"} deleted successfully.`,
        notFound: (key) => `${key || "Record"} not found.`,
        invalid: (key) => `Invalid ${key}.`,
        save: (key) => `${key || "Record"} saved successfully.`,
    },
    _response_message: {
        invalid: (key) => `Invalid ${key}.`,
        windowNAvailable: () => `Currently window not available.`,
        emailSend: () => `mail send successfully.`,
        allReadyExist: (key) => `${key || "Data"} already exist.`,
        created: (name) => `${name || "Record"} created successfully.`,
        updated: (name) => `${name || "Record"} updated successfully.`,
        notFound: (key) => `${key || "Record"} not found.`,
        exportCsv: (key) => `${key || "Record"} downloaded successfully.`,
        deleted: (name) => `${name || "Record"} deleted successfully.`,
        allReadyDeleted: (key) => `${key || "Data"} already deleted.`,
        found: (key) => `${key || "Record"} found successfully.`,
        mailSent: (key) => `${key || "Record"} sent successfully.`,
        mailNotSent: (key) => `${key || "Record"} not sent.`,
        Unauthorized: (key) => `${key || "User"} Unauthorized`,
        allReadyUpdated: (key, value) => `${key || "Record"} already updated ${value ? "as " + value : ""}`,
        uploaded: (name) => `${name || "Record"} uploaded successfully.`,
        subscribe: (key) => `Subscribed to event: ${key}`,
        invalid_delivery_date: (key) => `${key || "Date"} must be greater than Expiry date.`,
        confirm_password_match: (key) => `${key} Password and confirm password should match.`,
        not_found: (key) => `${key}.`,
        otpSend: () => `OTP send successfully.`,
    }
}