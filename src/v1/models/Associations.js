
const { _auth_module } = require("@src/v1/utils/constants/messages");
const { getDatabaseConnection } = require("../middlewares/db_pool");
const { UserModel } = require("./app/User");
const { OrganizationModel } = require("./master/Organizations");
const { AccountModel } = require("./master/Accounts");

async function getAssoicatedModel(organization) {
    const tenantDB = await getDatabaseConnection(organization)


    const TenantOrganization = OrganizationModel(tenantDB)
    const TenantAccount = AccountModel(tenantDB)
    const User = UserModel(tenantDB)

    // Return Collection Instance
    return {
        tenantDB,
        TenantOrganization,
        TenantAccount,
        User
    }
}

module.exports = {
    getAssoicatedModel
}
