"""Étalonnage 'cosy village' d'après le moodboard Clash of Cabs.
Usage: python3 -I grade.py SRC DST [--mode jour|crepuscule]"""
import sys, numpy as np
from PIL import Image, ImageFilter

def rgb2hsv(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    mx=a.max(-1); mn=a.min(-1); d=mx-mn
    h=np.zeros_like(mx)
    m=d>1e-6
    rc=np.where(m,(mx-r)/np.where(m,d,1),0); gc=np.where(m,(mx-g)/np.where(m,d,1),0); bc=np.where(m,(mx-b)/np.where(m,d,1),0)
    h=np.where(r==mx,bc-gc,np.where(g==mx,2+rc-bc,4+gc-rc)); h=(h/6)%1; h=np.where(m,h,0)
    s=np.where(mx>0,d/np.where(mx>0,mx,1),0)
    return h,s,mx
def hsv2rgb(h,s,v):
    i=np.floor(h*6).astype(int)%6; f=h*6-np.floor(h*6)
    p=v*(1-s); q=v*(1-s*f); t=v*(1-s*(1-f))
    out=np.stack([np.choose(i,[v,q,p,p,t,v]),np.choose(i,[t,v,v,q,p,p]),np.choose(i,[p,p,t,v,v,q])],-1)
    return out

def grade(im, mode="jour"):
    alpha = im.getchannel("A") if im.mode=="RGBA" else None
    a=np.asarray(im.convert("RGB"),dtype=np.float32)/255
    h,s,v=rgb2hsv(a)
    deg=h*360
    # Verts acides -> prairie/sauge (vers l'olive, moins saturés)
    g=np.clip(1-np.abs(deg-105)/55,0,1)
    h=h+g*(-14/360); s=s*(1-0.30*g); v=v*(1-0.06*g)
    # Bleus d'eau -> étang turquoise
    w=np.clip(1-np.abs(deg-200)/25,0,1)*(v>0.45)
    h=h+w*(-12/360); s=s*(1-0.25*w)
    # Saturation globale adoucie
    s=s*0.86
    h=h%1
    a=hsv2rgb(h,np.clip(s,0,1),np.clip(v,0,1))
    # Chaleur : ombres chêne, hautes lumières crème/lanterne
    lum=(a@np.array([.299,.587,.114]))[...,None]
    shadow=np.array([0x6E,0x52,0x36])/255; hi=np.array([0xF3,0xE6,0xC4])/255
    a=a+(1-lum)**2*0.10*(shadow-a)+lum**2*0.10*(hi-a)
    # Courbe douce (léger fondu, moins de contraste dur)
    a=0.04+a*0.94
    if mode=="crepuscule":
        amber=np.array([0xF2,0xB3,0x5E])/255
        a=a*np.array([0.92,0.80,0.70])+ (lum**1.5)*0.18*amber
    out=Image.fromarray((np.clip(a,0,1)*255+.5).astype(np.uint8))
    if alpha is not None: out.putalpha(alpha)
    return out

if __name__=="__main__":
    src,dst=sys.argv[1],sys.argv[2]
    mode=sys.argv[4] if len(sys.argv)>4 else "jour"
    im=Image.open(src); im.load()
    grade(im,mode).save(dst, "WEBP", quality=88, method=6) if dst.endswith(".webp") else grade(im,mode).save(dst)
