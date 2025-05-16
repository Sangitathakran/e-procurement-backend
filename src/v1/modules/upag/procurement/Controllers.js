module.exports.getProcurementData = async (req, res) => {
    try{
        return res.status(200).json({ message: "Dummy response from getProcurementData" });
    
    }
    catch (error) {
        console.log("Error in getProcurementData: ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}