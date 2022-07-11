const router = require('koa-router')()
const util = require('../utils/util')
const Role = require('../models/roleSchema')


// 路由前缀
router.prefix('/roles')

// 查询所有角色列表
router.get('/allList', async (ctx) => {
    // 因为是查询全部 所以无需参数{} 只需要返回id和roleName
    try {
        const list = await Role.find({}, "_id roleName");
        ctx.body = util.success(list);
    } catch (error) {
        ctx.body = util.fail(`查询失败:${error.stack}`)
    }

})

// 按页获取角色列表
router.get('/list', async (ctx) => {
    // get请求query取参 post请求body取参
    const { roleName } = ctx.request.query;
    const { page, skipIndex } = util.pager(ctx.request.query);
    try {
        // 这里不能直接使用roleName 因为可能为空出现去查询空的情况
        // 所以加一层处理
        let param = {};
        if (roleName) param.roleName = roleName;
        // find返回结构为promise的query 所以这里不需要加await
        const query = Role.find(param);
        // 用query继续做分页
        // 这里就需要加上await
        const list = await query.skip(skipIndex).limit(page.pageSize);
        const total = await Role.countDocuments(param);
        ctx.body = util.success({
            list,
            page: {
                ...page,
                total
            }
        });
    } catch (error) {
        ctx.body = util.fail(`查询失败:${error.stack}`);
    }
});

// 角色的操作-创建 编辑 删除
router.post('/operate', async (ctx) => {
    const { roleName, remark, _id, action } = ctx.request.body;
    let res, info;
    try {
        if (action == 'create') {
            res = await Role.create({ roleName, remark });
            info = '创建成功';
        } else if (action == 'edit') {
            if (_id) {
                let param = {
                    roleName,
                    remark,
                    updateTime: new Date(),
                }
                res = await Role.findByIdAndUpdate(_id, param);
                info = '编辑成功';
            } else {
                ctx.body = util.fail(`缺少参数params:_id`);
            }

        } else {
            // 删除
            if (_id) {
                res = await Role.findByIdAndRemove(_id);
                info = '删除成功';
            } else {
                ctx.body = util.fail(`缺少参数params:_id`);
            }
        }
        ctx.body = util.success(res, info);
    } catch (error) {
        ctx.body = util.fail(`操作失败${error.stack}`)
    }

});
// 权限设置
router.post('/update/permission', async (ctx) => {
    const { _id, permissionList } = ctx.request.body;
    try {
        let param = {
            permissionList,
            updateTime: new Date(),
        }
        let res = await Role.findByIdAndUpdate(_id, param);
        ctx.body = util.success(`权限设置成功`);
    } catch (error) {
        ctx.body = util.fail(`权限设置失败`);
    }
});

module.exports = router