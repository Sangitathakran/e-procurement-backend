
// templates to export 
const templates = {
    order_template: {
        "Farmer Name": '',
        "Aadhar Number": '',
        "Procured Quantity": '',
        "Order Value": '',
        "Bank Name": '',
        "Bank Account Number": '',
        "IFSC Code": '',
    },
}

function exportTemplate(tableName) {
    switch (tableName) {
        case "orders":
            return templates.order_template;
        default:
            throw new Error('Invalid table name');
    }
}

module.exports = { exportTemplate };

