/**
    jsRealB 3.0
    Guy Lapalme, lapalme@iro.umontreal.ca, nov 2019
 */
"use strict";
////// Constructor for a Phrase (a subclass of Constituent)

// phrase (non-terminal)
function Phrase(elements,constType){
    Constituent.call(this,constType); // super constructor
    this.elements=[];
    // list of elements to create the source of the parameters at the time of the call
    // this can be different from the elements lists because of structure modifications
    this.elementsSource=[]
    if (elements.length>0){
        const last=elements.length-1;
        // add all elements except the last to the list of elements
        for (let i = 0; i < last; i++) {
            let e=elements[i];
            if (typeof e=="string"){
                e=Q(e);
            }
            if (e instanceof Constituent) {
                e.parentConst=this;
                this.elements.push(e);
                this.elementsSource.push(e);
            } else {
                this.warning("the "+NO(i+1).dOpt({ord:true})+ " parameter:"+e+" is not a Constituent, it is ignored",
                             "le "+NO(i+1).dOpt({ord:true})+ " paramètre:"+e+" n'étant pas un Constituent est ignoré")
            }
        }
        // terminate the list with add which does other checks on the final list
        this.add(elements[last],undefined,true)
    }
}
extend(Constituent,Phrase)

// add a new constituent, set agreement links
Phrase.prototype.add = function(constituent,position,prog){
    // create constituent
    if (typeof constituent=="string"){
        constituent=Q(constituent);
    }
    if (!(constituent instanceof Constituent)){
        return this.warning("the last parameter is not a Constituent, it is ignored",
                            "le dernier paramètre n'étant pas un Constituent est ignoré");
    }
    if (prog===undefined){// real call to .add 
        this.optSource+=".add("+constituent.toSource()+(position===undefined?"":(","+position) )+")"
    } else {
        this.elementsSource.push(constituent) // call from the constructor        
    }
    constituent.parentConst=this;
    // add it to the list of elements
    if (position == undefined){
        this.elements.push(constituent);
    } else if (typeof position == "number" && position<this.elements.length || position>=0){
        this.elements.splice(position,0,constituent)
    } else {
        this.warning("Bad position for .add:"+position+" which should be less than "+this.elements.length,
                     "Mauvaise position pour .add:"+position+ " qui devrait être inférieure à "+this.elements.length)
    }
    // change content or content position of some children
    this.setAgreementLinks();
    for (let i = 0; i < this.elements.length; i++) {
        const e=this.elements[i];
        if (e.isA("A")){// check for adjective position
            const idx=this.getIndex("N");
            const pos=this.isFr()?(e.prop["pos"]||"post"):"pre"; // all English adjective are pre
            if (idx >= 0){
                if ((pos=="pre" && i>idx)||(pos=="post" && i<idx)){
                    const adj=this.elements.splice(i,1)[0];
                    this.elements.splice(idx,0,adj);
                }
            }
        } else if (e.isA("NP") && e.prop["pro"]!==undefined){
            e.pronominalize()
        }
    }
    return this;
}
    
Phrase.prototype.grammaticalNumber = function(){
    return this.error("grammaticalNumber must be called on a NO, not a "+this.constType);
}


// loop over children to make links between elements that should agree with each other
Phrase.prototype.setAgreementLinks = function(){
    if (this.elements.length==0)return this;
    switch (this.constType) {
    case "NP": // agrees with the first internal N, number with a possible NO
        let noNumber,noConst;
        for (let i = 0; i < this.elements.length; i++) {
            const e=this.elements[i]
            if (e.isOneOf(["N","NP"]) && this.agreesWith===undefined){
                this.agreesWith=e;
            } else if (e.isA("NO")){
                noConst=e;
            } else if (e.isOneOf(["D","Pro","A"])){
                e.agreesWith=this;
            }
        }
        if (noConst !== undefined && this.agreesWith !== undefined){// there was a NO in the S
            this.agreesWith.prop["n"]=noConst.grammaticalNumber(); 
            // gender agreement between a French number and subject
            noConst.prop["g"]=this.agreesWith.getProp("g"); 
        }
        //   set agreement between the subject of a subordinate or the object of a subordinate
        const pro=this.getFromPath(["SP","Pro"]);
        if (pro!==undefined){
            if (contains(["qui","who"],pro.lemma)){// agrees with this NP
                pro.agreesWith=this;
            } else if (this.isFr() && pro.lemma=="que"){
                // in French past participle can agree with a cod appearing before... keep that info in case
                const v=pro.parentConst.getFromPath(["VP","V"]);
                if (v !=undefined){
                    v.prop["cod"]=this
                }
            }
        }
        break;
    case "AP": // agrees with the first internal A
        for (let i = 0; i < this.elements.length; i++) {
            const e=this.elements[i]
            if (e.isA("A")){
                this.agreesWith=e;
                break;
            }
        }
        break;
    case "VP": // agrees with the first internal V
        for (let i = 0; i < this.elements.length; i++) {
            const e=this.elements[i]
            if (e.isA("V")){
                this.agreesWith=e;
                break;
            }
        }
    case "AdvP": case "PP": // no agreement needed
        break;
    case "CP":
        // not sure agreement has to be done...
        break;
    case "S": case "SP":
        var iSubj=this.getIndex(["NP","N","CP","Pro"]);
        // determine subject
        if (iSubj>=0){
            let subject=this.elements[iSubj];
            if (this.isA("SP") && subject.isA("Pro") && contains(["que","où","that"],subject.lemma)){
                // HACK: the first pronoun  should not be a subject...
                //        so we try to find another...
                const jSubj=this.elements.slice(iSubj+1).findIndex(
                    e => e.isOneOf(["NP","N","CP","Pro"])
                );
                if (iSubj>=0){
                    subject=this.elements[iSubj+1+jSubj];
                } else {
                    // finally this generates too many spurious messages
                    // this.warning("no possible subject found");
                    return this;
                }
            }
            this.agreesWith=subject;
            const vpv=this.getFromPath([["VP",""],"V"]);
            if (vpv !== undefined){
                vpv.verbAgreeWith(subject);
                if (this.isFr() && vpv.lemma=="être"){// check for a French attribute of "ëtre"
                    // with an adjective
                    const attribute=vpv.parentConst.getFromPath([["AP",""],"A"]);
                    if (attribute!==undefined){
                        attribute.agreesWith=subject;
                    } else { // check for a past participle after the verb
                        var elems=vpv.parentConst.elements;
                        var vpvIdx=elems.findIndex(e => e==vpv);
                        if (vpvIdx<0){
                            this.error("setAgreementLinks: verb not found, but this should never have happened")
                        } else {
                            for (var i=vpvIdx+1;i<elems.length;i++){
                                var pp=elems[i];
                                if (pp.isA("V") && pp.prop["t"]=="pp"){
                                    pp.agreesWith=subject;
                                    break;
                                }
                            }
                        }
                    }
                }
            } else {
                // check for a coordination of verbs that share the subject
                const cvs=this.getFromPath(["CP","VP"]);
                if (cvs !==undefined){
                    this.getConst("CP").elements.forEach(function(e){
                        if (e instanceof Phrase)e.verbAgreeWith(subject)
                    })
                }
                if (this.isFr()){ 
                    //  in French, check for a coordinated object of a verb in a SP used as cod 
                    //  occurring before the verb
                    const cp=this.getConst("CP");
                    const sp=this.getConst("SP");
                    if (cp !==undefined && sp !== undefined){
                        var sppro=sp.getConst("Pro");
                        if (sppro !== undefined && sppro.lemma=="que"){
                            var v=sp.getFromPath([["VP",""],"V"]);
                            if (v!==undefined){
                                v.prop["cod"]=cp;
                            }
                        }
                    }
                }
            }
        } else {
            // finally this generates too many spurious messages
            // this.warning("no possible subject found")
        }
        break;
    default:
        this.error("setAgreementLinks,unimplemented type:"+this.constType)
    }
    return this;
}

//////// tools

//  returns an identification string, useful for error messages
Phrase.prototype.me = function(){
    const children=this.elements.map(function(e){return e.me()});
    return this.constType+"("+children.join()+")";
}

Phrase.prototype.setLemma = function(lemma,terminalType){
    this.error("***: should never happen: setLemma: called on a Phrase");
    return this;
}

// find the index of a Constituent type (or one of the constituents) in the list of elements
Phrase.prototype.getIndex = function(constTypes){
    if (typeof constTypes == "string")constTypes=[constTypes];
    return this.elements.findIndex(e => e.isOneOf(constTypes),this);
}

// find a given constituent type (or one of the constituent) in the list of elements
Phrase.prototype.getConst = function(constTypes){
    const idx=this.getIndex(constTypes);
    if (idx < 0) return undefined;
    return this.elements[idx]
}

//////////// information propagation

// find the gender and number of NP elements of this Phrase
//   set masculine if at least one NP is masculine
//   set plural if one is plural or more than one combined with and
Phrase.prototype.findGenderNumber = function(andCombination){
    let g="f";
    let n="s";
    let nb=0;
    for (let i = 0; i < this.elements.length; i++) {
        const e=this.elements[i];
        if (e.isOneOf(["NP","N"])){
            nb+=1
            if (e.getProp("g")=="m")g="m";
            if (e.getProp("n")=="p")n="p"
        }
    }
    if (nb==0) g="m";
    else if (nb>1 && n=="s" && andCombination)n="p";  
    return {"g":g,"n":n}
}

////////////// Phrase structure modification

// Phrase structure modification but that must be called in the context of the parentConst
// because the pronoun depends on the role of the NP in the sentence 
//         and its position can also change relatively to the verb
Phrase.prototype.pronominalize = function(){
    if (this.isA("NP")){
        const npParent=this.parentConst
        let proS,idxV=-1;
        if (npParent!==null){
            const myself=this;
            const idxNP=npParent.elements.findIndex(e => e==myself,this);
            if (this==npParent.agreesWith){// is subject 
                proS=this.isFr()?"je":"I";
            } else if (npParent.isA("PP")){ // is indirect complement
                proS=this.isFr()?"je":"I";
            } else if (npParent.isA("SP") && npParent.elements[0].isA("Pro")){ // is relative
                proS=this.isFr()?"je":"I";
            } else {
                proS=this.isFr()?"le":"me"; // is direct complement;
                idxV=npParent.getIndex("V");
            }
            const pro=Pro(proS);
            pro.agreesWith=this.agreesWith;
            pro.prop=this.prop;
            if (this==npParent.agreesWith){
                npParent.agreesWith=pro
            }
            if (this.isFr() && proS=="le" && 
                // in French a pronominalized NP as direct object is moved before the verb
                idxV>=0 && npParent.elements[idxV].getProp("t")!="ip"){ // (except at imperative tense) 
                npParent.elements.splice(idxNP,1);   // remove NP
                npParent.elements[idxV].prop["cod"]=this;
                npParent.elements.splice(idxV,0,pro);// insert pronoun before the V
            } else {
                npParent.elements.splice(idxNP,1,pro);// insert pronoun where the NP was
            }
            pro.parentConst=npParent;
        } else {// special case without parentConst so we leave the NP and change its elements
            var pro=Pro(this.isFr()?"je":"I");
            prop.prop=this.prop;
            pro.agreesWith=this.agreesWith;
            this.elements=[pro];
        }
    } else {
        this.warning(".pro() should be applied only to an NP, not a"+this.constType,
                     ".pro() ne devrait être appliqué qu'à un NP, non un "+this.constType)
    }
}

// modify the sentence structure to create a passive sentence
Phrase.prototype.passivate = function(){
    let subject,vp,newSubject;
    const nominative=this.isFr()?"je":"I";
    const accusative=this.isFr()?"moi":"me";
    // find the subject at the start of this.elements
    if (this.isA("VP")){
        subject=null;
        vp=this;
    } else {
        vp=this.getConst("VP");
        if (vp !== undefined){
            if (this.elements.length>0 && this.elements[0].isOneOf(["N","NP","Pro"])){
                subject=this.elements.shift();
                if (subject.isA("Pro")){
                    if (subject.lemma==nominative)subject.setLemma(accusative);
                    else if (subject.lemma==accusative)subject.setLemma(nominative); 
                }
            } else {
                subject=null;
            }
        } else {
            return this.warning("Phrase.passivate: no VP found",
                                "Phrase.passivate: aucun VP trouvé")
        }
    }
    // remove object (first NP or Pro within VP) from elements
    if (vp !== undefined) {
        let objIdx=vp.getIndex(["NP","Pro"]);
        if (objIdx>=0){
            var obj=vp.elements.splice(objIdx,1)[0]; // splice returns [obj]
            if (obj.isA("Pro")){
                if (objIdx==0){// a French pronoun inserted by .pro()
                    obj.setLemma(nominative);  // make the new subject nominative
                    objIdx=vp.getIndex("V")+1 // ensure that the new object will appear after the verb
                } else 
                    if (obj.lemma==accusative)obj.setLemma(nominative);
            }
            // swap subject and obj
            newSubject=obj;
            this.elements.unshift(newSubject); // add object that will become the subject
            newSubject.parentConst=this;       // adjust parentConst
            this.agreesWith=newSubject;
            if (subject!=null){   // insert subject where the object was
                vp.elements.splice(objIdx,0,PP(P(this.isFr()?"par":"by"),subject)); 
                subject.parentConst=vp; // adjust parentConst
            }
        } else if (subject !=null){ // no object, but with a subject that we keep as is
            newSubject=subject;
            if (subject.isA("Pro")){
                // the original subject at nominative will be reinserted below!!!
                subject.setLemma(nominative);
            } else { 
                //create a dummy subject with a "il" unless it is at the imperative tense
                if (vp.getProp("t")!=="ip"){
                    subject=Pro(nominative).g(this.isFr()?"m":"n").n("s").pe(3);
                }
            }
            this.elements.unshift(subject);
            this.agreesWith=subject;
        }
        if (this.isFr()){
            // do this only for French because in English this is done by processTyp_en
            // change verbe into an "être" auxiliary and make it agree with the newSubject
            const verbeIdx=vp.getIndex("V")
            const verbe=vp.elements.splice(verbeIdx,1)[0];
            const aux=V("être").t(verbe.getProp("t"));
            aux.parentConst=vp;
            aux.prop=verbe.prop;
            aux.pe(3); // force person to be 3rd (number and tense will come from the new subject)
            if (vp.getProp("t")=="ip"){
                aux.t("s") // set subjonctive present tense for an imperative
            }
            aux.agreesWith=newSubject;
            const pp = V(verbe.lemma).t("pp");
            pp.agreesWith=newSubject;
            pp.parentConst=vp;
            vp.elements.splice(verbeIdx,0,aux,pp);
        }
    } else {
        this.warning("Phrase.passivate: no VP found",
                     "Phrase.passivate: aucun VP trouvé");
    }
}

// generic phrase structure modification for a VP, called in the .typ({...}) for .prog, .mod, .neg
// also deals with coordinated verbs
Phrase.prototype.processVP = function(types,key,action){
    const v=this.getFromPath(["CP","VP"]);
    if (v!==undefined){// possibly a coordination of verbs
        this.getConst("CP").elements.forEach(function(e){
            if (e.isA("VP")){ e.processVP(types,key,action) }
        });
        return;
    }
    const val=types[key];
    if (val !== undefined && val !== false){
        let vp;
        if (this.isA("VP")){vp=this}
        else {
            const idxVP=this.getIndex(["VP"]);
            if (idxVP >=0 ) {vp=this.elements[idxVP]}
            else {
                this.warning('.typ("'+key+":"+val+'") without VP',
                             '.typ("'+key+":"+val+'") sans VP');
                return;
            }
        }
        const idxV=vp.getIndex("V");
        if (idxV!==undefined){
            const v=vp.elements[idxV];
            action(vp,idxV,v,val);
        }
    }
}

Phrase.prototype.processTyp_fr = function(types){
    // process types in a particular order
    this.processVP(types,"prog",function(vp,idxV,v){
        if (idxV>0 && vp.elements[idxV-1].isA("Pro") && vp.elements[idxV-1].agreesWith!==undefined){
            // this is pronoun created by .pro() so move it after "en train","de" (separate so that élision can be done...) 
            const pro=vp.elements.splice(idxV-1,1)[0]; // remove the pronoun before the verb
            vp.elements.splice(idxV+1,0,Q("en train"),Q("de"),pro,V(v.lemma).t("b"))
        } else {
            vp.elements.splice(idxV+1,0,Q("en train"),Q("de"),V(v.lemma).t("b"));
        }
        v.setLemma("être"); // chenge verb, but keep person, number and tense properties of the original...
    });
    this.processVP(types,"mod",function(vp,idxV,v,mod){
        var vUnit=v.lemma;
        for (var key in rules.verb_option.modalityVerb){
            if (key.startsWith(mod)){
                v.setLemma(rules.verb_option.modalityVerb[key]);
                break;
            }
        }
        if (idxV>0 && vp.elements[idxV-1].isA("Pro") && vp.elements[idxV-1].agreesWith!==undefined){
            // this is pronoun created by .pro() so move it after the modality verb
            const pro=vp.elements.splice(idxV-1,1)[0]; // remove the pronoun before the verb
            vp.elements.splice(idxV+1,0,pro);
        }
        vp.elements.splice(idxV+1,0,V(vUnit).t("b"));
    });
    this.processVP(types,"neg",function(vp,idxV,v,neg){
        if (neg === true)neg="pas";
        v.prop["neg2"]=neg; // HACK: to be used when conjugating at the realization time
        // insert "ne" before the verb or before a possible pronoun preceding the verb
        if (idxV>0 && vp.elements[idxV-1].isA("Pro")){
            vp.elements.splice(idxV-1,0,Adv("ne"));
        } else {
            vp.elements.splice(idxV,0,Adv("ne"));
        }
    })
}

// negation of modal auxiliaries
const negMod={"can":"cannot","may":"may not","shall":"shall not","will":"will not","must":"must not",
              "could":"could not","might":"might not","should":"should not","would":"would not"}    

Phrase.prototype.processTyp_en = function(types){
    // replace current verb with the list new words
    //  TODO: take into account the fact that there might be already a verb with modals...
    let vp;
    if (this.isA("VP")){vp=this}
    else {
        const idxVP=this.getIndex(["VP"]);
        if (idxVP !==undefined) {vp=this.elements[idxVP]}
        else {
            this.warning('.typ("'+key+'") without VP',
                         '.typ("'+key+'") sans VP');
            return;
        }
    }
    const idxV=vp.getIndex("V");
    if(idxV!==undefined){
        let v = vp.elements[idxV];
        const pe = this.getProp("pe");
        const g=this.getProp("g");
        const n = this.getProp("n");
        let t = vp.getProp("t");
        const neg = types["neg"]===true;
        // English conjugation 
        // it implements the "affix hopping" rules given in 
        //      N. Chomsky, "Syntactic Structures", 2nd ed. Mouton de Gruyter, 2002, p 38 - 48
        let auxils=[];  // list of Aux followed by V
        let affixes=[];
        let isFuture=false;
        if (t=="f"){
            isFuture=true;
            t="p"; // the auxiliary will be generated here so remove it from the V
        }
        const prog = types["prog"]!==undefined && types["prog"]!==false;
        const perf =types["perf"]!==undefined && types["perf"]!==false;
        const pas =types["pas"]!==undefined && types["pas"]!==false;
        const interro = types["int"];
        const modality=types["mod"];
        if (types["contr"]!==undefined && types["contr"]!==false){
            vp.contraction=true; // necessary because we want the negation to be contracted within the VP before the S or SP
            this.contraction=true;
        }
        const compound = rules.compound;
        if (modality !== undefined && modality !== false){
            auxils.push(compound[modality].aux);
            affixes.push("b");
        } else if (isFuture){
            // caution: future in English is done with the modal will, so another modal cannot be used
            auxils.push(compound.future.aux);
            affixes.push("b");
        }
        if (perf || prog || pas){
            if (perf){
                auxils.push(compound.perfect.aux);
                affixes.push(compound.perfect.participle);
            }
            if (prog) {
                auxils.push(compound.continuous.aux);
                affixes.push(compound.continuous.participle)
            }
            if (pas) {
                auxils.push(compound.passive.aux);
                affixes.push(compound.passive.participle)
            }
        } else if (interro !==undefined && interro !== false && 
                   auxils.length==0 && v.lemma!="be" && v.lemma!="have"){ 
            // add auxiliary for interrogative if not already there
            if (interro!="wos"){
                auxils.push("do");
                affixes.push("b");
            }
        }
        auxils.push(v.lemma);
        // realise the first verb, modal or auxiliary
        v=auxils.shift();
        let words=[];
        // conjugate the first verb
        if (neg) { // negate the first verb
            if (v in negMod){
                if (v=="can" && t=="p"){
                    words.push(Q("cannot"))
                } else {
                    words.push(V(v).pe(1).n(n).t(t))
                    words.push(Adv("not"))
                }
            } else if (v=="be" || v=="have") {
                words.push(V(v).pe(pe).n(n).t(t));
                words.push(Adv("not"));
            } else {
                words.push(V("do").pe(pe).n(n).t(t));
                words.push(Adv("not"));
                if (v != "do") words.push(V(v).t("b")); 
            }
        } else 
            words.push(V(v).pe(v in negMod?1:pe).n(n).t(t));
        // realise the other parts using the corresponding affixes
        while (auxils.length>0) {
            v=auxils.shift();
            words.push(V(v).t(affixes.shift()));
        }
        // HACK: splice the content of the array into vp.elements
        words.forEach(function(w){w.parentConst=vp});
        Array.prototype.splice.apply(vp.elements,[idxV,1].concat(words));
    } else {
        this.warning("no V found in a VP",
                     "aucun V trouvé dans un VP")
    }
}

// get elements of the constituent cst2 within the constituent cst1
Phrase.prototype.getIdxCtx = function(cst1,cst2){
    if (this.isA(cst1)){
        var idx=this.getIndex(cst2)
        if (idx!==undefined)return [idx,this.elements];
    } else if (this.isOneOf(["S","SP"])){
        var cst=this.getConst(cst1);
        if (cst!==undefined)return cst.getIdxCtx(cst1,cst2);
    }
    return undefined
}

Phrase.prototype.moveAuxToFront = function(){
    // in English move the auxiliary to the front 
    if (this.isEn()){
        if (this.isOneOf(["S","SP"])){ 
            let idxCtx=this.getIdxCtx("VP","V");
            if (idxCtx!==undefined){
                let vpElems=idxCtx[1]
                const v=vpElems.splice(0,1)[0]; // remove first V
                // check if V is followed by a negation, if so move it also
                if (vpElems.length>0 && vpElems[0].isA("Adv") && vpElems[0].lemma=="not"){
                    const not=vpElems.splice(0,1)[0]
                    this.elements.splice(0,0,v,not)
                } else {
                    this.elements.splice(0,0,v);
                }
            }
        }
    }
}

// modify sentence structure according to the content of the .typ(...) option
Phrase.prototype.typ = function(types){
    const allowedTypes={
      "neg": [false,true],
      "pas": [false,true],
      "prog":[false,true],
      "exc": [false,true],
      "perf":[false,true],
      "contr":[false,true],
      "mod": [false,"poss","perm","nece","obli","will"],
      "int": [false,"yon","wos","wod","wad","woi","whe","why","whn","how","muc"]
    }
    this.addOptSource("typ",types)
    if (this.isOneOf(["S","SP","VP"])){
        // validate types and keep only ones that are valid
        const entries=Object.entries(types);
        for (let i = 0; i < entries.length; i++) {
            const key=entries[i][0];
            const val=entries[i][1];
            const allowedVals=allowedTypes[key];
            if (allowedVals===undefined){
                if (!(key=="neg" && typeof val == "string")){
                    this.warning(key+" is not allowed as key of .typ",
                                 key+" n'est pas accepté comme clé de .typ");
                    delete types[key]
                }
            }
        }
        if (types["pas"]!==undefined && types["pas"]!== false){
            this.passivate()
        }
        if (this.isFr()){
            if (types["contr"]!==undefined && types["contr"]!==false){
                this.warning("contraction is ignored in French",
                "la contraction est ignorée en français");
            }
            this.processTyp_fr(types) 
        } else { 
            this.processTyp_en(types) 
        }
        const int=types["int"];
        if (int !== undefined && int !== false){
            const sentenceTypeInt=rules.sentence_type.int;
            const prefix=sentenceTypeInt.prefix;
            switch (int) {
            case "yon": case "whe": case "why": case "whn": case "how": case "muc":
                    this.moveAuxToFront()
                break;
            // remove a part of the sentence 
            case "wos":// remove subject (first NP,N, Pro or SP)
                if (this.isOneOf(["S","SP"])){
                    const subjIdx=this.getIndex(["NP","N","Pro","SP"]);
                    if (subjIdx!==undefined){
                        this.elements.splice(subjIdx,1);
                        // insure that the verb at the third person singular, 
                        // because now the subject has been removed
                        const v=this.getFromPath(["VP","V"])
                        if (v!==undefined){
                            v.prop["n"]="s";
                            v.prop["pe"]=3;
                        }
                    }
                }
                break;
            case "wod": case "wad": // remove direct object (first NP,N,Pro or SP in the first VP)
                if (this.isOneOf(["S","SP"])){
                    this.moveAuxToFront();
                    const objIdxCtx=this.getIdxCtx("VP",["NP","N","Pro","SP"]);
                    if (objIdxCtx!==undefined){
                        objIdxCtx[1].splice(objIdxCtx[0],1);
                    }
                }
                break;
            case "woi": // remove direct object (first PP in the first VP)
                if (this.isOneOf(["S","SP"])){
                    this.moveAuxToFront();
                    const objIdxCtx=this.getIdxCtx("VP","PP");
                    if (objIdxCtx!==undefined){
                        objIdxCtx[1].splice(objIdxCtx[0],1);
                    }
                }
                break;
            default:
                this.warning(int+" interrogative type not implemented",
                             int+" type d'interrogative non implanté")
            }
            if(this.isFr() || int !="yon") // add the interrogative prefix
                this.elements.splice(0,0,Q(prefix[int]));
            this.a(sentenceTypeInt.punctuation,true);
        }    
        const exc=types["exc"];
        if (exc !== undefined && exc === true){
            this.a(rules.sentence_type.exc.punctuation,true);
        }
    } else {
        this.warning(".typ("+JSON.stringify(types)+") applied to a "+this.constType+ " should be S, SP or VP",
                     ".typ("+JSON.stringify(types)+") appliqué à un "+this.constType+ " devrait être S, SP or VP");
    }
    return this;
}

////////////////// Realization

//  special case of realisation of a cp for which the gender and number must be computed
//    at realization time...

Phrase.prototype.cpReal = function(){
    var res=[];
    // realize coordinated Phrase by adding ',' between elements except the last
    const idxC=this.getIndex("C");
    // take a copy of all elements except the coordonate
    const elems=this.elements.filter(function(x,i){return i!=idxC})
    var last=elems.length-1;
    // compute the combined gender and number of the coordination
    if(idxC >= 0 ){
        // var c=this.elements.splice(idxC,1)[0]
        var c=this.elements[idxC]
        var and=this.isFr()?"et":"and";
        var gn=this.findGenderNumber(c.lemma==and)
        this.prop["g"]=gn.g;
        this.prop["n"]=gn.n;
    }            
    if (last==0){// coordination with only one element, ignore coordinate
        Array.prototype.push.apply(res,elems[0].real());
    } else {
        for (let j = 0; j < last; j++) { //insert comma after each element
            const ej=elems[j];
            if (j<last-1 && 
                (ej.prop["a"] === undefined || !contains(ej.prop["a"],",")))
                    ej.prop["a"]=[","]
            Array.prototype.push.apply(res,ej.real())
        }
        // insert realisation of C before last...
        if(idxC>=0)
            Array.prototype.push.apply(res,this.elements[idxC].real());
        Array.prototype.push.apply(res,elems[last].real());
    }
    return this.doFormat(res); // process format for the CP
}

// special case of VP for which the complements are put in increasing order of length
Phrase.prototype.vpReal = function(){
    var res=[];
    function realLength(terms){
        // sum the length of each realization and add the number of words...
        return terms.map(t=>t.realization.length).reduce((a,b)=>a+b,0)+terms.length
    }
    // get index of last V (to take into account possible auxiliaries)
    const last=this.elements.length-1;
    var vIdx=last;
    while (vIdx>=0 && !this.elements[vIdx].isA("V"))vIdx--;
    // copy everything up to the V (included)
    if (vIdx<0)vIdx=last;
    else {
        const t=this.elements[vIdx].getProp("t");
        if (t == "pp") vIdx=last; // do not rearrange sentences with past participle
        else if (contains(["être","be"],this.elements[vIdx].lemma)) { // do not rearrange complements of être/be
            vIdx=last 
        }
    } 
    let i=0;
    while (i<=vIdx){
        Array.prototype.push.apply(res,this.elements[i].real());
        i++;
    }
    if (i>last) {
        return this.doFormat(res); // process format for the VP
    }
    // save all succeeding realisations
    let reals=[]
    while (i<=last){
        reals.push(this.elements[i].real())
        i++;
    }
    // sort realisations in increasing length
    reals.sort(function(s1,s2){return realLength(s1)-realLength(s2)})
    reals.forEach(r=>Array.prototype.push.apply(res,r)); // add them
    return this.doFormat(res) // process format for the VP
}

// creates a list of Terminal each with its "realization" field now set
Phrase.prototype.real = function() {
    let res=[];
    if (this.isA("CP")){
        res=this.cpReal()
    } else {
        const es=this.elements;    
        for (let i = 0; i < es.length; i++) {
            const e = es[i];
            var r;
            if (e.isA("CP")){
                r=e.cpReal();
            } else if (e.isA("VP") && reorderVPcomplements){
                r=e.vpReal();
            } else {
                r=e.real()
            }
            // we must flatten the lists
            Array.prototype.push.apply(res,r)
        }
    }
    return this.doFormat(res);
};

// recreate a jsRealB expression
// if indent is a number create an indented pretty-print (call it with 0 at the root)
Phrase.prototype.toSource = function(indent){
    var sep, newIdent;
    if (typeof indent == "number"){
        newIdent=indent+this.constType.length+1;
        sep=",\n"+Array(newIdent).fill(" ").join("")
    } else {
        sep=",";
        newIdent=undefined
    }
    // create source of children
    let res=this.constType+"("+this.elementsSource.map(e => e.toSource(newIdent)).join(sep)+")";
    // add the options by calling "super".toSource()
    res+=Constituent.prototype.toSource.call(this); // ~ super.toSource()
    return res;
    
}

/////////////// Constructors for the user

// functions for creating Phrases
function S   (_){ return new Phrase(Array.from(arguments),"S"); };
function NP  (_){ return new Phrase(Array.from(arguments),"NP"); }
function AP  (_){ return new Phrase(Array.from(arguments),"AP"); }
function VP  (_){ return new Phrase(Array.from(arguments),"VP"); }
function AdvP(_){ return new Phrase(Array.from(arguments),"AdvP"); }
function PP  (_){ return new Phrase(Array.from(arguments),"PP"); }
function CP  (_){ return new Phrase(Array.from(arguments),"CP"); }
function SP  (_){ return new Phrase(Array.from(arguments),"SP"); }
