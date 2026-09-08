import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus, { ElDialog, ElMessageBox } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import VXETable from 'vxe-table';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'vxe-table/lib/style.css';
import App from './App.vue';
import router from './router';
import './styles/global.scss';

/** 判断是否为 MessageBox 配置对象 */
function isMessageBoxOptions(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** 为 MessageBox 默认关闭「点遮罩关闭」 */
function patchMessageBoxNoModalClose(): void {
  const wrap = <T extends (...args: never[]) => unknown>(fn: T): T =>
    ((...args: unknown[]) => {
      const last = args[args.length - 1];
      if (isMessageBoxOptions(last)) {
        args[args.length - 1] = { closeOnClickModal: false, ...last };
      } else {
        args.push({ closeOnClickModal: false });
      }
      return (fn as (...a: unknown[]) => unknown)(...args);
    }) as T;
  ElMessageBox.alert = wrap(ElMessageBox.alert.bind(ElMessageBox));
  ElMessageBox.confirm = wrap(ElMessageBox.confirm.bind(ElMessageBox));
  ElMessageBox.prompt = wrap(ElMessageBox.prompt.bind(ElMessageBox));
}

// 全局：点击弹框外不关闭
ElDialog.props.closeOnClickModal.default = false;
patchMessageBoxNoModalClose();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.use(VXETable);
app.mount('#app');
