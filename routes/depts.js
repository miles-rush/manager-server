const router = require('koa-router')()
const util = require('../utils/util')
const Dept = require('../models/deptSchema')

// 路由前缀
router.prefix('/dept')
// 部门树形列表
router.get('/list', async (ctx) => {
    let { deptName } = ctx.request.query;
    let params = {};
    if (deptName) params.deptName = deptName;
    let rootList = await Dept.find(params);
    if (deptName) {
        // 这里是一个条件查询
        ctx.body = util.success(rootList);
    } else {
        // 全量查询
        // 需要拼接成树形结构
        let tressList = getTreeDept(rootList, null, []);
        ctx.body = util.success(tressList);
    }

});
// 递归拼接
const getTreeDept = (rootList, id, list) => {
    for (let i = 0; i < rootList.length; i++) {
        let item = rootList[i];
        if (String(item.parentId.slice().pop()) == String(id)) {
            list.push(item._doc);
        }
    }
    list.map(item => {
        item.children = [];
        getTreeDept(rootList, item._id, item.children);
        if (item.children.length == 0) {
            delete item.children;
        }
    });
    return list;
};

// 部门操作 创建 编辑 删除
router.post('/operate', async (ctx) => {
    const { _id, action, ...params } = ctx.request.body;
    let res, info;
    try {
        if (action == 'create') {
            res = await Dept.create(params);
            info = '创建成功';
        } else if (action == 'edit') {
            // 需要追加更新时间
            params.updateTime = new Date();
            res = await Dept.findByIdAndUpdate(_id, params);
            info = '编辑成功';
        } else if (action == 'delete') {
            // 删除本条数据
            res = await Dept.findByIdAndRemove(_id);
            // 递归删除以_id为父id的所有数据
            await Dept.deleteMany({ parentId: { $all: [_id] } });
        }
        ctx.body = util.success({}, info);
    } catch (error) {
        ctx.body = util.fail(error.stack);
    }
});


// 需要导出
module.exports = router;