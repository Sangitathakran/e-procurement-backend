const getFilter=async(req,fields)=>{
        let query={};
           if(req.query.search){
            query["$or"]=fields.map(item=>{
                return ({ [item]: { $regex: req.query.search, $options: "i" } })
            })
           }
    return query
}


module.exports={
    getFilter
}