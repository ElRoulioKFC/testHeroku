var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080
var compteur = 0               ;


const fs = require('fs');

let rawdata = fs.readFileSync('produit.json');
var jso = JSON.parse(rawdata);

var commande = creationCommande(jso);


app.get('/', function(req, res){
	res.sendFile(__dirname + '/session2.html');
});

http.listen(port,function(){
	console.log('serveur en écoute sur le port ' + port);
});

io.on('connect', function(socket){
	console.log('un client est connecté');
	var data = getDataFromCompteur(compteur,jso);
		io.emit('compteur', compteur);
		io.emit('name', data[0]);
		io.emit('prix', data[1]);
		io.emit('quant', data[2]);
		io.emit('stock', (data[3]));


	socket.on('minus', function () {
		removeProduct(compteur,commande,jso);
		io.emit('panier',getPanier(commande,jso));
		io.emit('total',totalCost(commande,jso));
	});

	socket.on('plus', function () {
		addProduct(compteur,commande,jso);
		io.emit('panier',getPanier(commande,jso));
		io.emit('total',totalCost(commande,jso));
	});

	socket.on('cancel', function () {
		removeAll(commande,json);
		io.emit('panier', getPanier(commande,jso));
	});

	socket.on('left', function () {
		compteur = changeCompteur(-1,compteur,jso);
		var data = getDataFromCompteur(compteur,jso);
		io.emit('name', (data[0]));
		io.emit('prix', (data[1]));
		io.emit('quant', (data[2]));
		io.emit('stock', (data[3]));

	});
	socket.on('right', function () {
		compteur = changeCompteur(1,compteur,jso);
		var data = getDataFromCompteur(compteur,jso);
		io.emit('name', (data[0]));
		io.emit('prix', (data[1]));
		io.emit('quant', (data[2]));
		io.emit('stock', (data[3]));

		});

	socket.on('removeAll', function () {
		commande = removeAll(commande,jso);
		io.emit('panier',getPanier(commande,jso));
		io.emit('total',totalCost(commande,jso));
		});
		socket.on('buyAll', function () {
			jso = buyPanier(jso,commande);
			commande = removeAll(commande,jso);
			var data = getDataFromCompteur(compteur,jso);
			io.emit('stock', (data[3]));
			io.emit('panier',getPanier(commande,jso));
			io.emit('total',totalCost(commande,jso));
			});
});

function getListName(json) {
  let list = [];
	for (var i = 0; i < json.produit.length; i++) {
		list[i] = json.produit[i].name;
	}
	return list;
}
function getNameFromCompteur(nb,json){
	return json.produit[nb].name;
}
function getQuantFromCompteur(nb,json){
	return json.produit[nb].quant;
}
function getPrixFromCompteur(nb,json){
	return json.produit[nb].prix;
}
function getStockFromCompteur(nb,json){
	return json.produit[nb].stock;
}
function changeCompteur(i,nb,json){
	nb += i;
	if (nb< 0){
		nb = json.produit.length-1;
	}
	if (nb>=json.produit.length){
			nb = 0;
	}
	return nb
}

function getDataFromCompteur(nb,json){
	var list = [];
	list[0] = getNameFromCompteur(nb,json);
	list[1] = getPrixFromCompteur(nb,json);
	list[2] = getQuantFromCompteur(nb,json);
	list[3] = getStockFromCompteur(nb,json);

	return list;
}
function creationCommande(json){
	let list = {};
	for (var i = 0; i < json.produit.length; i++) {
		list[json.produit[i].name] = 0;
	}
	return list;
}

function addProduct(nb,com,json){
	if (getStockFromCompteur(nb,json)>com[getNameFromCompteur(nb,json)]+1)
	com[getNameFromCompteur(nb,json)] += 1;
	return com;
}
function removeProduct(nb,com,json){
	if (com[getNameFromCompteur(nb,json)] > 0){
		com[getNameFromCompteur(nb,json)] -= 1;
	}
	return com;
}
function removeAll(com,json){
	return creationCommande(json);
}
function getCompteurFromName(nom,json){
	let list = {};
	for (var i = 0; i < json.produit.length; i++) {
		if (json.produit[i].name == nom) return i;
	}
	return -1;
}
function getPanier(com,json){
	var list = getListName(json);
	var res = "";
	for (var i in list) {
		var name = list[i];
   if (com[name] > 0 ) {
	 res += (name + " : quantité " + com[name] + "  quantité totale : " +(com[name] * json.produit[getCompteurFromName(name,json)].quant) + "g"+ "  prix total : " +(com[name] * json.produit[getCompteurFromName(name,json)].prix) +"\n");
}}
	return res;
}
function totalCost(com,json){
	var list = getListName(json);
	var prix = 0;
	var poidsTotal = 0;
	for (var i in list) {
		var name = list[i];
   if (com[name] > 0 ) {
		 prix += (com[name] * json.produit[getCompteurFromName(name,json)].prix);
		 poidsTotal += (com[name] * json.produit[getCompteurFromName(name,json)].quant);
}}
	if (poidsTotal < 20000){
		var livraison = 20;
	}else if (poidsTotal < 40000){
		var livraison = 40;
	}else if (poidsTotal< 60000){
		var livraison = 50;
	}else {
		var livraison = 70
	}
		if (prix > 0){
		return "cout total : " + (prix + livraison) + " dont livraison(" + livraison + ")";
	}else {
		return "";
	}
}
function buyPanier(json,commande){
	let newJson = json;
	for (var i = 0; i < newJson.produit.length; i++) {
		console.log(newJson.produit[i].stock +"-="+ commande[newJson.produit[i].name]);
		newJson.produit[i].stock -= commande[newJson.produit[i].name];
	}
let data = JSON.stringify(newJson, null, 2);
	fs.writeFile('produit.json', data, (err) => {
    if (err) throw err;
    console.log('Data written to file');
});
	return newJson;
}
