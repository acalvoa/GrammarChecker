var fs = require('fs');

var clui = require('clui');
var Progress = clui.Progress;

var words = {};
var words_array = [];
var spanish = fs.readFileSync("espanol.txt", 'utf8');
var exceptions = JSON.parse(fs.readFileSync("exceptions.json", 'utf8'));

// Recorremos el diccionario y quitamos los saltos de linea;
spanish = spanish.replace(/\r?\n|\r/g, " ");
spanish = spanish.split(" ");
spanish_filter = [];
spanish.forEach(element => {
    if(element.length > 3){
       spanish_filter.push(element);
    }
});
spanish = spanish_filter.concat(exceptions);
delete spanish_filter;
spanish.sort(function(a, b){ 
    return a.length-b.length
});
var length_index = {};
// CREAMOS LOS INDICES
for(i=0; i< spanish.length;i++){
    if(typeof length_index[spanish[i].length] == "undefined") length_index[spanish[i].length] = i;
}
fs.readFile('textos.txt', 'utf8', function(err, contents) {
    var dict = contents.replace(/\r?\n|\r/g, " ").replace(/[.|,|:|;|\-|¡|!|?|¿|}|{|»|'|'|"|\/|nº|$|(|)|<|>]+/g,"").replace(/\s+/g, " ").replace(/\d/g, "");
    dict = dict.split(" ");
    dict.forEach(element => {
        if(element.length <= 23 && element.length > 3){
            if(typeof words[element.toLowerCase()] != "undefined") return words[element.toLowerCase()]++;
            words[element.toLowerCase()] = 1;
        }
    });
    // metemos en un array
    for(key in words){
        words_array.push({
            word: key,
            frecuency: words[key]
        });
    }
    var thisProgressBar = new Progress(100);
    // Ordenamos
    words_array.sort(function(a, b){ 
        return b.frecuency-a.frecuency
    });
    //devolvemos el diccionario
    var diccionario = {};
    for(i=0; i<words_array.length; i++){
        process.stdout.write('\033c');
        console.log("Generando diccionario intermedio");
        console.log('Palabras Procesadas '+i+'/'+words_array.length+' \n\r'+thisProgressBar.update(i, words_array.length));
        var cota_inferior = (typeof length_index[words_array[i].word.length-1] == "undefined")? length_index[words_array[i].word.length] : length_index[words_array[i].word.length-1];
        var cota_superior = (typeof length_index[words_array[i].word.length+1] == "undefined")? length_index[words_array[i].word.length] : length_index[words_array[i].word.length+1];
        var words_list = {};
        for(l=cota_inferior; l<cota_superior;l++){
            var dist = levensthein(words_array[i].word, spanish[l]);
            if(dist == 0){
                diccionario[words_array[i].word] = words_array[i].frecuency;
                break;
            }
        }
    }
    fs.writeFileSync('dict_medio.json', JSON.stringify(diccionario));
    process_dict(diccionario);
});
function levensthein(word,compare){
    if (word.length === 0) return compare.length
    if (compare.length === 0) return word.length
    let tmp, i, j, prev, val, row
    // swap to save some memory O(min(word,compare)) instead of O(word)
    if (word.length > compare.length) {
      tmp = word
      word = compare
      compare = tmp
    }
    row = Array(word.length + 1)
    // init the row
    for (i = 0; i <= word.length; i++) {
      row[i] = i
    }
  
    // fill in the rest
    for (i = 1; i <= compare.length; i++) {
      prev = i
      for (j = 1; j <= word.length; j++) {
        if (compare[i - 1] === word[j - 1]) {
          val = row[j - 1] // match
        } else {
          val = Math.min(row[j - 1] + 1, // substitution
                Math.min(prev + 1,     // insertion
                         row[j] + 1))  // deletion
        }
        row[j - 1] = prev
        prev = val
      }
      row[word.length] = prev
    }
    return row[word.length]
}
function process_dict(dict_medio){
    var thisProgressBar = new Progress(100);
    // Devolvemos el diccionario
    var diccionario = {};
    // Lo llenamos con las palabras admitidas
    for(key in dict_medio){
        diccionario[key] = 0;
    }
    for(i=0; i<words_array.length; i++){
        process.stdout.write('\033c');
        console.log("Generando diccionario final");
        console.log('Palabras Procesadas '+i+'/'+words_array.length+' \n\r'+thisProgressBar.update(i, words_array.length));
        if(typeof diccionario[words_array[i].word] != "undefined"){
            diccionario[words_array[i].word] = parseInt(diccionario[words_array[i].word]) + parseInt(words_array[i].frecuency);
        }
        var words_list = {};
        for(key in dict_medio){
            var dist = levensthein(words_array[i].word, key);
            if(typeof words_list[dist] == "undefined") words_list[dist] = [];
            words_list[dist].push(key);
        }
        for(k=0; k<10; k++){
            if(typeof words_list[k.toString()] != "undefined"){
                diccionario[words_list[k.toString()][0]] = parseInt(diccionario[words_list[k.toString()][0]]) + parseInt(words_array[i].frecuency);
                break;
            } 
        }
    }
    // Buscamos si las excepciones estan con frecuencia sino las insertamos con frecuencia 1
    exceptions.forEach(element => {
        if(typeof diccionario[element] == "undefined"){
            diccionario[element] = 1;
        }
    });
    // Generamos el diccionario final
    var retorno = {};
    for(key in diccionario){
        if(typeof retorno[key.length] == "undefined") retorno[key.length] = {};
        retorno[key.length][key] = diccionario[key];
    }
    fs.writeFileSync('dict_contraloria.json', JSON.stringify(retorno));
}