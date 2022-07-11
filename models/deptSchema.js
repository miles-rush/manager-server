const mongoose = require('mongoose');
// 模式对象 导出 Modal
const deptSchema = mongoose.Schema({
    deptName: String,
    userId: String,
    userName: String,
    userEmail: String,
    parentId: [mongoose.Types.ObjectId],
    "createTime": {
        type: Date,
        default: Date.now()
    },//创建时间
    "updateTime": {
        type: Date,
        default: Date.now()
    },//更新时间

})
// dept 会自动去映射数据库中的 depts
module.exports = mongoose.model("depts", deptSchema)