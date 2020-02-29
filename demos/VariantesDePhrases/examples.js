// add person names to the vocabulary
loadEn();
addToLexicon({"John":{"N":{"g":"m","tab":["n4"]}}})
addToLexicon({"Jim": {"N":{"g":"m","tab":["n4"]}}})
addToLexicon({"Bill":{"N":{"g":"m","tab":["n4"]}}})
addToLexicon({"Mary":{"N":{"g":"f","tab":["n4"]}}})
addToLexicon({"cheat":{"N":{"tab":["n1"]},"V":{"tab":"v1"}}})
/* 
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch6.html",no:"35a",
 expr:`
`},
*/

var examplesEn = [
{
 expr:`
S(NP(D('the'),
     N('cat')),
  VP(V('eat'),
     NP(D('the'),
        N('mouse'))))`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch6.html",no:"35a",
 expr:`
S(Pro("I").pe(2),
  VP(V("know"),
     SP(Pro("that"),
        S(N("Bill"),
          VP(V("marry").t("ps"),
             NP(D("my").g("m").ow("s"),
                Q("ex").lier("-"),N("wife")))))))
`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch6.html",no:"35b",
 expr:`
S(Pro("I").g("f"),
  VP(V("love"),
     Pro("me"),Adv("still")))
`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch6.html",no:"Homework 6 (1a)",
 expr:`
S(N("Mary"),
  VP(V("talk"),
     PP(P("to"),N("Bill"))))
`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch7.html",no:"11",
 expr:`
S(NP(N("John")),
  VP(V("cheat").t("ps"),NP(N("Bill"))))
`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch7.html",no:"12",
 expr:`
S(NP(D("the"),N("teacher")),
  VP(V("put").t("ps"),
     NP(D("the"),N("glass").n("p")),
     PP(P("in"),NP(D("the"),N("drawer")))))`
},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch7.html",no:"26b",
 expr:`
S(NP(N("Bill")),
  VP(V("explain"),
     NP(D("the"),N("problem")),
        PP(P("to"),Pro("me").g("f"))))
`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch7.html",no:"26c",
 expr:`
S(NP(N("Jim")),
  VP(V("make"),
     NP(D("the"),N("claim"),
        SP(S(Pro("that"),
          NP(N("Bill")),
          VP(V("put").t("ps"),
             NP(D("the"),N("idea")),
             PP(P("behind"),
                Pro("me")))).typ({mod:"nece"})
           ))))
`},
];
var examplesFr = [
    {
     expr:`
S(NP(D('le'),
     N('chat')),
  VP(V('manger'),
     NP(D('le'),
        N('souris'))))`},
{ref:"Lingolia",url:"https://francais.lingolia.com/fr/grammaire/les-verbes/passif",no:"2",
     expr:`
S(NP(D('le'),
     N('passant').n("p")),
  VP(V('appeler'),
     NP(D('le'),
        N('ambulance'))))`},
{ref:"Lingolia",url:"https://francais.lingolia.com/fr/grammaire/les-verbes/passif",no:"3",
     expr:`
S(NP(D('le'),
     N('police')),
  VP(V('recueillir'),
     NP(D('un'),
        N('témoignage').n("p"))))`},
{ref:"Huang",url:"http://www.people.fas.harvard.edu/~ctjhuang/lecture_notes/lecch6.html",no:"35a",
 expr:`
S(Pro("je").pe(2),
  VP(V("savoir"),
     SP(Pro("que"),
        S(Q("Bill"),
          VP(V("épouser").t("ps"),
             D("mon").g("m"),
             Q("ex").lier("-"),N("femme"))))
             ))
`}
];

var examples={"en":examplesEn,"fr":examplesFr};
