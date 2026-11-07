import os, sys, time, gc, json, argparse
from pathlib import Path
import torch
import cv2
from PIL import Image
from transformers import AutoTokenizer

MODEL = Path(r"C:/Users/hu/AI/MOSS-Image")
OUT = MODEL / "qichi_out"
OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(MODEL))
from pipeline_moss_image import MOSSImagePipeline

TASKS = {
  "profile-linzhixia": dict(w=960,h=1280,seed=31051,faces=1,prompt="一位29岁的中国女性，东亚面孔，建筑设计师，清透自然的妆容，黑色长发，穿米白色丝质衬衫，坐在窗边安静地看向镜头。真实摄影，暖色胶片质感，自然光，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景是浅米色墙面，只有她一个人，背景简洁。"),
  "profile-shenzhiwei": dict(w=960,h=1280,seed=31002,faces=1,prompt="一位31岁的中国女性，东亚面孔，品牌策略顾问，温婉知性，齐肩黑发，穿深绿色针织上衣，坐在茶室木桌旁，柔和侧光。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-zhouyuan": dict(w=960,h=1280,seed=31003,faces=1,prompt="一位27岁的中国女性，东亚面孔，纪录片剪辑师，清爽短发，穿深蓝色牛仔衬衫，肩背相机，站在有自然光的城市街角，神情安静而敏锐。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-xuqinghe": dict(w=960,h=1280,seed=31004,faces=1,prompt="一位30岁的中国女性，东亚面孔，科技公司产品负责人，利落长发，穿浅灰色西装外套，站在明亮的现代办公室窗前，自信温和。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-gunanzhi": dict(w=960,h=1280,seed=31005,faces=1,prompt="一位33岁的中国女性，东亚面孔，独立策展人，黑色长发低束，穿亚麻质感米色长裙，站在当代艺术空间的白墙旁，神情从容，有艺术气质。真实摄影，暖色胶片质感，柔和的自然侧光，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-sunian": dict(w=960,h=1280,seed=31006,faces=1,prompt="一位28岁的中国女性，东亚面孔，律师，黑发自然披肩，穿剪裁利落的黑色西装外套，坐在安静的咖啡馆窗边，神情清醒而柔和。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-chenyu": dict(w=960,h=1280,seed=31057,faces=1,prompt="一位32岁的中国男性，东亚面孔，建筑师，短黑发，穿深灰色针织衫，气质沉稳温和，站在浅米色墙面前，只有他一个人，自然侧光。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-jiangxu": dict(w=960,h=1280,seed=31008,faces=1,prompt="一位30岁的中国男性，东亚面孔，早期基金投资经理，黑色短发，穿深色西装外套不系领带，站在高层办公室窗前，神情自信克制。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-lujianchuan": dict(w=960,h=1280,seed=31009,faces=1,prompt="一位34岁的中国男性，东亚面孔，学术编辑与译者，戴细框眼镜，穿深棕色针织开衫，坐在堆满书的木桌旁，神情温和有书卷气。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-heyan": dict(w=960,h=1280,seed=31010,faces=1,prompt="一位29岁的中国男性，东亚面孔，智能硬件工程师，短黑发，穿深蓝色轻薄夹克，站在海边或户外，笑容坦率，自然光。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-wenyining": dict(w=960,h=1280,seed=31011,faces=1,prompt="一位31岁的中国男性，东亚面孔，私房餐厅主厨，短黑发，穿米白色厨师围裙和深色衬衫，站在温暖的自然光厨房里，神情踏实温和。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景简洁。"),
  "profile-chengye": dict(w=960,h=1280,seed=31072,faces=1,prompt="一位28岁的中国男性，东亚面孔，独立音乐人，略长的黑发，穿旧牛仔外套，肩上背着木吉他，站在纯浅米色摄影棚背景前，只有他一个人，自然侧光，气质自由松弛。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，半身构图，背景干净，没有其他人。"),
  "hero-couple": dict(w=960,h=1200,seed=32011,faces=2,prompt="一对30岁左右的中国情侣，东亚面孔，只有两个人，画面中没有其他人，近景半身，女性在左男性在右，两人自然相拥，面部清晰可见，眼神温柔，女性穿米白色丝质连衣裙，男性穿深色针织衫，自然光。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端生活方式杂志封面，上海老洋房窗边，背景简洁。"),
  "hero-alt1": dict(w=960,h=1200,seed=32021,faces=2,prompt="一对30岁左右的中国情侣，东亚面孔，正面半身双人肖像，两人并肩站立，女性在左男性在右，都看向镜头，温柔微笑，穿米白丝质裙和深色针织衫，自然光，老洋房窗边，真实摄影，暖色胶片，浅景深，低饱和暖米色调，高端生活方式杂志封面，画面中只有两个人，背景简洁。"),
  "hero-alt2": dict(w=960,h=1200,seed=32022,faces=2,prompt="一对30岁左右的中国情侣，东亚面孔，正面半身双人肖像，两人并肩站立，女性在左男性在右，都看向镜头，温柔微笑，穿米白丝质裙和深色针织衫，自然光，老洋房窗边，真实摄影，暖色胶片，浅景深，低饱和暖米色调，高端生活方式杂志封面，画面中只有两个人，背景简洁。"),
  "small-portrait": dict(w=768,h=1024,seed=32002,faces=1,prompt="一位28岁的中国女性，东亚面孔，近景肖像，清透自然的妆容，黑色长发，穿米白色丝质上衣，安静地看向镜头。真实摄影，暖色胶片质感，自然光，浅景深，低饱和暖米色调，高端生活方式杂志编辑肖像，背景简洁。"),
  "manifesto": dict(w=1200,h=800,seed=32013,faces=2,prompt="一对中国情侣坐在窗边安静交谈，东亚面孔，三十岁左右，两个人的侧脸都清晰可见，女性在左男性在右，穿米白与深色天然材质服装，自然亲密，不摆拍。真实摄影，暖色胶片质感，柔和的自然光，浅景深，低饱和暖米色调，高端生活方式杂志摄影，横向构图，老洋房室内，背景简洁。"),
  "story": dict(w=960,h=1200,seed=32004,faces=2,prompt="一对中国新婚伴侣，东亚面孔，女性穿象牙白丝质婚纱，男性穿深色西装，在柔和的窗边自然相拥，真实婚礼纪实，不摆拍。真实摄影，暖色胶片质感，浅景深，低饱和暖米色调，高端婚礼杂志摄影，半身构图，背景简洁。"),
  "cta-couple": dict(w=1280,h=720,seed=32015,faces=1,prompt="一对中国伴侣在黄昏的城市屋顶相拥，东亚面孔，三十岁左右，近景半身，女性靠在男性肩头，两人侧脸清晰可见，女性穿米白长裙，男性穿深色西装，城市天际线在背景中虚化，自然亲密。真实摄影，暖色胶片质感，电影感，浅景深，低饱和暖米色调，高端生活方式杂志摄影，横向构图。"),
  "event": dict(w=1200,h=800,seed=32006,faces=6,prompt="一群中国年轻专业人士在上海老洋房的长桌旁共进晚餐，暖黄灯光，自然交谈，真实抓拍，克制的奢华感。真实摄影，生活方式杂志摄影，低饱和暖色调，木质长桌，精致餐具，柔和虚化背景，横向构图。"),
}

def encode(pipe, text):
    f = pipe.tokenizer.apply_chat_template([{"role":"user","content":text}], tokenize=False, add_generation_prompt=True, enable_thinking=True)
    inp = pipe.tokenizer(f, return_tensors="pt", truncation=True, max_length=4096)
    with torch.no_grad():
        out = pipe.text_encoder(**inp, use_cache=False, return_dict=True)
    return out.last_hidden_state, torch.ones(out.last_hidden_state.shape[:2], dtype=torch.bool)

def face_count(path):
    im = cv2.imread(str(path))
    if im is None: return 0
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    return len(cas.detectMultiScale(gray, 1.05, 5))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", default="")
    args = ap.parse_args()
    ids = [x.strip() for x in args.ids.split(",") if x.strip()] or list(TASKS)
    print("loading local MOSS pipeline...", flush=True)
    t0 = time.time()
    pipe = MOSSImagePipeline.from_components_pretrained(
        transformer_path=str(MODEL/"transformer"),
        text_encoder_path=str(MODEL/"text_encoder"),
        vae_path=str(MODEL/"vae"),
        local_files_only=True,
    )
    pipe.text_encoder.to("cpu"); pipe.transformer.to("cuda"); pipe.vae.to("cuda")
    pipe.vae.enable_tiling()
    pipe.tokenizer = AutoTokenizer.from_pretrained(str(MODEL/"tokenizer"), local_files_only=True)
    pipe.tokenizer.chat_template = open(MODEL/"tokenizer"/"chat_template.jinja", encoding="utf-8").read()
    pipe.set_progress_bar_config(disable=True)
    print("loaded", round(time.time()-t0,1), flush=True)
    neg, nm = encode(pipe, "")
    meta=[]
    for index, name in enumerate(ids, 1):
        task = TASKS[name]
        out = OUT / f"{name}.png"
        if out.exists():
            print("skip", name, flush=True); continue
        prompt = task["prompt"]
        print(f"[{index}/{len(ids)}] encode {name}", flush=True)
        t=time.time(); pos, pm = encode(pipe, prompt)
        print("  encoded", round(time.time()-t,1), flush=True)
        pos, pm = pos.cuda(), pm.cuda(); negd, nmd = neg.cuda(), nm.cuda()
        gc.collect(); torch.cuda.empty_cache()
        t=time.time()
        image = pipe(prompt=None, prompt_embeds=pos, prompt_attention_mask=pm,
                     negative_prompt_embeds=negd, negative_prompt_attention_mask=nmd,
                     height=task["h"], width=task["w"], num_inference_steps=16,
                     guidance_scale=3.0,
                     generator=torch.Generator(device="cuda").manual_seed(task["seed"])).images[0]
        image.save(out)
        elapsed=round(time.time()-t,1)
        nf=face_count(out)
        print(f"  generated {name} {task['w']}x{task['h']} in {elapsed}s faces={nf}", flush=True)
        meta.append({"name":name,"w":task["w"],"h":task["h"],"seed":task["seed"],"faces":nf,"seconds":elapsed,"prompt":prompt})
        del pos,pm,negd,nmd,image; gc.collect(); torch.cuda.empty_cache()
    with open(OUT/"metadata.jsonl","a",encoding="utf-8") as f:
        for row in meta: f.write(json.dumps(row,ensure_ascii=False)+"\n")
    print("done", flush=True)

if __name__ == "__main__":
    main()
