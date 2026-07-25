# Changelog

## [1.3.1] - 2026-07-25

### Fixed - 管理后台登录状态过期处理

#### 自动退出过期登录
- 修复 JWT 已过期但管理后台仍显示为已登录的问题。
- 进入管理后台时，先检查 JWT 过期时间，并通过 `/api/auth/me` 验证当前登录状态。
- 页面保持打开期间，到达 JWT 过期时间后自动清除本地登录状态并返回登录页。
- 新增、修改、删除和批量导入明信片时，如果服务器返回 `401` 或 `403`，自动退出登录并提示“登录已过期，请重新登录”。
- 手动退出登录时直接清理登录状态并显示登录页，无需重新加载整个页面。

#### 后端认证响应优化
- 过期或无效的 JWT 统一返回 HTTP `401`。
- 对过期令牌返回更明确的错误信息，便于前端识别并自动退出登录。

**修改的文件：**
- `admin.html` - 增加令牌检查、定时自动退出和认证请求统一处理
- `server/app.js` - 优化 JWT 过期及无效令牌的响应状态和提示

---

## [1.3.0] - 2026-07-15

### Changed - 代码结构优化

#### 公共模块抽取
- 提取国家中英文映射表到独立文件 `countryMap.json`，减少 `app.js` 约100行代码
- 新增 `postcard-utils.js` 公共工具模块，统一处理数据获取和映射逻辑

**postcard-utils.js 提供的方法：**
| 方法名 | 说明 |
|--------|------|
| `loadCountryMap()` | 加载国家映射表 |
| `fetchPostcards()` | 统一数据获取 |
| `normalizePostcard()` | 统一数据映射（处理tags、字段兼容等） |
| `getRegionKey()` | 地图区域键值获取 |
| `extractProvince()` | 省份名称提取 |
| `getDuration()` | 漂流天数计算 |

#### 地图渲染优化
- 优化 `updateMap()` 方法，移除完全重绘标志，改为增量更新数据
- 复用 `PostcardUtils.getRegionKey()` 避免重复代码

#### 安全中间件启用
- 重新启用 helmet 安全中间件
- 保持 CSP 禁用以兼容页面内联脚本
- 启用 X-Frame-Options、X-Content-Type-Options 等安全头

**修改的文件：**
- `countryMap.json` - 新增，国家中英文映射数据
- `postcard-utils.js` - 新增，公共数据获取和工具方法
- `app.js` - 使用公共模块，移除内联映射表
- `index.html` - 引入 postcard-utils.js
- `dashboard.html` - 使用公共模块
- `timeline.html` - 使用公共模块
- `server/app.js` - 启用 helmet 安全中间件

---

## [1.2.0] - 2026-07-14

### Changed - 管理后台体验优化

#### 添加明信片表单优化
- 将“平台”字段从纯文本输入改为下拉选择，内置 `Post-Hi`、`Manyour`、`Postcrossing` 三个常用平台。
- 新增“自定义”平台选项，选择后可手动输入平台名称；编辑旧数据时，非预设平台会自动回填到自定义输入框。
- 图片链接支持根据明信片编号自动生成，格式为：

```text
https://img.yuechucard.space/[ID]图像面.jpg
```

#### 数据概览页增强
- 新增“国家/地区排行 Top 5”，按地区优先、国家兜底统计明信片数量，并显示收到/寄出明细。
- 新增“平台分布”饼图，展示不同平台的数量和占比，并加入鼠标悬浮动效。
- 新增“最近动态”，展示最近维护的明信片记录。
- 新增“近六月收寄趋势”，按月份统计收到与寄出数量。
- 优化概览页布局，改为更稳定的响应式网格，避免卡片高度错位。

**修改的文件：**
- `admin.html` - 优化后台添加明信片表单与数据概览面板

---

## [1.1.1] - 2026-06-10

### Fixed - 图片加载优化

#### 移除图片时间戳
移除图片 URL 中的时间戳参数，恢复浏览器缓存机制，提升图片加载速度。

**问题原因：**
```javascript
// 之前：每次加载都生成新URL，浏览器缓存失效
card.imgFront + '?t=' + new Date().getTime()
```

**修复后：**
```javascript
// 直接使用原URL，浏览器会缓存
card.imgFront
```

**修改的文件：**
- `index.html` - 移除图片时间戳
- `detail.html` - 移除图片时间戳
- `timeline.html` - 移除图片时间戳

#### 其他修复
- 添加 favicon，消除 404 错误

---

## [1.1.0] - 2026-06-10

### Changed - 性能优化

#### CDN 资源本地化
将所有外部 CDN 资源改为本地加载，提升国内服务器访问速度。

**新增本地文件：**
- `libs/bootstrap.min.css` - Bootstrap 5.3.0 样式
- `libs/font-awesome.min.css` - Font Awesome 6.4.0 图标样式
- `libs/bootstrap-icons.css` - Bootstrap Icons 1.10.0 样式
- `libs/echarts.min.js` - ECharts 5.4.3 图表库
- `libs/echarts-china.js` - 中国地图数据
- `libs/echarts-world.js` - 世界地图数据
- `libs/vue.js` - Vue.js 2.7.14
- `libs/xlsx.min.js` - XLSX 0.18.5 表格处理库
- `libs/webfonts/` - Font Awesome 字体文件
- `libs/fonts/` - Bootstrap Icons 字体文件

**修改的文件：**
- `index.html` - 更新资源引用路径
- `detail.html` - 更新资源引用路径
- `timeline.html` - 更新资源引用路径
- `dashboard.html` - 更新资源引用路径
- `admin.html` - 更新资源引用路径

#### 服务器配置优化
- 添加字体文件 MIME 类型设置
- 临时禁用 helmet 安全中间件（调试用）

---

## [1.0.0] - 初始版本

### Features
- 明信片管理与展示系统
- 支持收发明信片记录
- 国内/世界地图热力分布
- 时间线筛选功能
- 数据统计面板
- 管理后台
