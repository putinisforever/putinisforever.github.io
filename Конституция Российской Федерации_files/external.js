
function attention_hide() {
    var element = document.getElementById('attention');
    element.style.display = 'none';
}

function attention_show() {
    var element = document.getElementById('attention');
    element.style.display = 'block';
}


function externalLinks() {  

    var closebutton = document.getElementById('tt-close');
    closebutton.onclick = function() { attention_hide(); }
    var twitter_link = document.getElementById('twitter-link');
    if(twitter_link){
        twitter_link.onclick = function() { attention_show(); }
    }
}

window.onload = externalLinks;





