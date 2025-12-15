
export const SYSTEM_PROMPT_TEMPLATE = `
你是一个开源项目产品演示页生成器，同时具备产品经理、文案和前端工程师的能力。

你的任务：生成一个还原度99%的单页 HTML 产品演示自动操作页面动画,这个页面必须既能直接在浏览器中渲染，也能被用户下载为 .html 文件后独立打开浏览。

【重要原则：高保真还原（≈99%）】
1. UI 高度还原：尽可能直接复用源码中的 HTML 结构、CSS 类名和样式。
2. 逻辑高度还原：尽量尊重并复用源码中的交互逻辑。
3. 只做「裁剪式演示」，但不降低还原度。
`;

export const STAGE_1_PROMPT = (
  sourceCode: string,
  requirements: string,
  musicEnabled: boolean = true,
  textDescriptionEnabled: boolean = true
) => `
<content>
${sourceCode}
</content>

<需求>
${requirements}
</需求>

请执行【阶段一：演示大纲 / 分镜生成】。

1. 分析输入：阅读代码和需求。
2. 设计“演示大纲 / 分镜”：将需求拆解成若干“场景（Scene）/ 步骤（Step）”。
${musicEnabled ? `3. **新增场景 0**：为了支持背景音乐播放（浏览器禁止自动播放音频），**必须**设计一个"场景 0：开始屏幕"。
   - 画面内容：一个优雅的覆盖层，包含产品 Logo 和一个显著的"Start Demo / 开启演示"按钮。
   - 交互：点击按钮后，覆盖层消失，背景音乐开始播放，后续场景的动画才开始执行。` : `3. 直接从第一个演示场景开始。`}
4. 对每个场景，用结构化方式描述（画面内容、使用 UI 片段、复用逻辑/状态、动画节奏）。
${textDescriptionEnabled ? `5. 在每个场景里补充一句简短的字幕/文案，增强故事性，能够叠加在画面上凸显卖点。` : `5. 不要设计额外的字幕或覆盖性文字，描述里只关注镜头和交互以及逻辑性。`}
6. 对于每个场景的切换，可以想想看如何丝滑插入文字描述这个产品有什么用，而不是单纯地按照产品使用顺序来做，从不同的角度打动人。
7. 采用最小化完整复刻原则，专注在营销而不是100%的产品使用，所以需要考虑什么是noise，应该聚焦什么，可以隐藏什么
**可以聚焦和隐藏的例子**：
<example>
演示feature的时候，聚焦feature，而产品的header和sidebar可以隐藏
演示feature A的时候，聚焦feature A的UI，而feature B的按钮可以隐藏
</example>
8. 选择性保留并微调界面，去掉无关的菜单和边框，只保留核心区域。鼠标的移动是匀速丝滑的，窗口的弹出是带有物理惯性的。
  目的: 让软件看起来比实际使用时更流畅、更轻盈、更高级
9. 不看“过程”，只看“魔法”：极致压缩操作步骤。例如：刚敲完代码 -> 网站立刻生成；刚输入 Prompt -> 视频立刻出现。省略中间的 Loading 时间。
  目的: 制造“所想即所得”的爽感，强调产品的效率和智能
10. 最后的场景可以生成一个无穷画布的感觉，就是最开始是1个演示，然后是2个，然后是4个，然后是16个，最后丝滑淡出显示产品LOGO/Title

可选：必要时动画可以采用采用Immersive UI Reveal"（沉浸式 UI 揭示） 或 "2.5D Parallax"，增加营销的感觉

输出格式请参照以下结构：
${musicEnabled ? `场景 0：开始屏幕（必须包含）
- 画面内容：...
- 交互逻辑：点击播放音乐并开始 Timeline` : ``}

场景 1：[标题]
- 画面内容：...
- 使用聚焦 UI 片段：...
- 隐藏 UI 内容：...
- 复用逻辑/状态：...
- 动画说明：...
${textDescriptionEnabled ? '- 场景字幕/文案：...（一句话，表面当前状态或者feature）' : ''}

最后请询问用户是否确认。
`;

export const STAGE_2_PROMPT = (
  musicEnabled: boolean = true,
  textDescriptionEnabled: boolean = true
) => `
用户已确认大纲。请执行【阶段二：代码生成】。

1. 结构与布局：使用 HTML/SVG 搭建，每个场景独立容器。
2. 样式：99% 还原High-Fidelity UI Demo，使用 Tailwind 或内联 CSS 匹配原样式。
3. 逻辑：复用原状态命名。
4. GSAP 动画：使用 GSAP timeline 串联场景。
${textDescriptionEnabled ? `5. 文本描述：为每个场景添加一块短字幕/文案（可绝对定位在角落或者大字幕在动画之前显示到中间，黑色半透明背景），随场景淡入淡出，不要遮挡主要 UI。` : `5. 文本描述：不要在画面上叠加额外字幕/文案，越简单越好，让动画完全依赖 UI 本身。`}
${musicEnabled ? `6. **背景音乐集成（必须）**：
   - 在 HTML 中添加: \`<audio id="bg-music" src="https://raw.githubusercontent.com/boringresearch/1-min-demo/refs/heads/main/media/demo.mp3" loop preload="auto"></audio>\`
   - 实现 **"Click to Start"** 逻辑：
     - 页面加载时：GSAP Timeline 处于 \`paused: true\` 状态。
     - 页面加载时：显示一个高层级的 "Start Demo" 按钮/覆盖层。
     - 用户点击按钮时：
       1. 调用 \`document.getElementById('bg-music').play()\` (设置 volume 为 0.3 左右，不要太吵)。
       2. 隐藏 Start 按钮/覆盖层。
       3. 调用 \`tl.play()\` 启动动画。
   - 这是为了遵守浏览器的 Autoplay 策略。
` : `6. 动画自动播放：页面加载后直接开始播放动画，无需用户点击。
`}
7. 采用最小化完整复刻原则，专注在营销而不是100%的产品使用，所以需要考虑什么是noise，应该聚焦什么，可以隐藏什么
8. **必须**包含完整的 HTML 文件内容，包括 <head> 中引入 GSAP 和 Tailwind (CDN)。

可选：必要时可以150%还原UI，增加营销的感觉，采用Immersive UI Reveal"（沉浸式 UI 揭示） 或 "2.5D Parallax"

输出格式：
请按照以下顺序输出代码块，不要夹杂过多解释：
\`\`\`html
<!DOCTYPE html>
<html lang="en">
...
</html>
\`\`\`
`;

export const FIX_PROMPT = (currentCode: string, userIssue: string) => `
<current_code>
${currentCode}
</current_code>

<user_issue>
${userIssue}
</user_issue>

The user has reported an issue or requested a change for the above HTML demo code.
Please fix the code specifically addressing the user's issue.
Return the COMPLETE, FULLY WORKING HTML code. Do not just return the diffs.
Ensure the code is ready to be saved as 'demo1.html' and run in a browser.

Output format:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
...
</html>
\`\`\`
`;
