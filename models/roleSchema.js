const mongoose = require('mongoose');
const roleSchema = mongoose.Schema({
    roleName: String,
    remark: String,
    permissionList: {
        checkedKeys: [],
        halfCheckedKeys: []
    },
    "createTime": {
        type: Date,
        default: Date.now()
    },//创建时间
    "updateTime": {
        type: Date,
        default: Date.now()
    },//更新时间
})
// role 会自动去映射数据库中的 roles
module.exports = mongoose.model("role", roleSchema)