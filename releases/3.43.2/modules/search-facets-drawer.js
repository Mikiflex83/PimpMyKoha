(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='search-facets-drawer',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Transforme les facettes de recherche en panneau repliable configurable.',
 sourceFiles:['055-facets-drawer.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 055-facets-drawer.js ===== */
/*
 Nom du fichier: 055-facets-drawer.js
 Dépendances: jQuery
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Transforme les facettes en tiroirs (search.pl). Requiert jQuery.
*/

(function(){
	if (!window.location.href.match(/search\.pl/)) {
		(function(){})('055-facets-drawer: skipped (not search.pl)');
		return;
	}

	if (!window.jQuery) {
		(function(){})('055-facets-drawer: skipped (jQuery missing)');
		return;
	}

	try {
		var $ = window.jQuery;
		$('#search-facets #availability_facet').contents().filter(function() { return (this.nodeType === 3 && !/\S/.test(this.nodeValue)); }).wrap('<h5></h5>').end();
		if ($('#search-facets #availability_facet h5').text().trim().length < 1) $('#search-facets #availability_facet h5').remove();
		$('#search-facets #availability_facet').contents().filter(function() { return this.nodeType === 3; }).wrap('<h5></h5>').end();
		$('#search-facets').children('ul').children('li').children('span').each(function() { $(this).replaceWith(function() { return $("<h5 />").append($(this).contents()); }); });

		$('#search-facets').children('ul').children('li').children('h5').wrap('<a class="viewSwitch" style="text-decoration: none; cursor: pointer;" />');
		$('#search-facets a.viewSwitch h5').prepend('<i class="fa fa-caret-right" aria-hidden="true"></i> ');
		$('#search-facets a.viewSwitch').parent().children('ul').wrap('<div class="contentsToggle" />');
		$('#search-facets div.contentsToggle').hide();
		$('#search-facets .contentsToggle').find('li.moretoggle').remove();
		$('#search-facets .collapsible-facet').show().removeAttr('class').removeAttr('style');
		$('#search-facets a.viewSwitch').click(function() {
			$(this).parent().children('.contentsToggle').toggle('slow');
			if ($(this).find('i').hasClass('fa-caret-right')) {
				$(this).find('i').addClass('fa-caret-down').removeClass('fa-caret-right');
			} else {
				$(this).find('i').addClass('fa-caret-right').removeClass('fa-caret-down');
			}
		});

		$('#search-facets .facet-label a').removeAttr('title').attr('role', 'status').after(function() { return $(this).clone().attr('role', 'label'); });
		$('#search-facets a[role="status"]').html('<span class="checkbox-toggle">☐</span> ');
		$('#search-facets a[role="label"]').replaceWith(function() { return this.innerHTML; });
		$('#search-facets a[title^="Remove facet"]').closest('li').contents().filter(function() { return this.nodeType == 3 && this.nodeValue.trim(); }).remove();
		$('#search-facets a[title^="Remove facet"]').each(function() { $(this).prependTo($(this).siblings('span')); });
		$('#search-facets a[title^="Remove facet"]').html('<span class="checkbox-toggle">☑</span> ');
		$('#search-facets a[title^="Remove facet"]').closest('.contentsToggle').siblings('.viewSwitch').trigger('click');
		$('#search-facets a[title^="Remove facet"]').on('click', function() { $(this).find('.checkbox-toggle').text('⏳'); });
		$('#search-facets a[role="status"]').on('click', function() { var checkbox = $(this).find('.checkbox-toggle'); checkbox.text(checkbox.text() === '☐' ? '☑' : '☐'); });
		$('#search-facets').on('click', '.checkbox-toggle', function() { var currentCheckbox = $(this); currentCheckbox.text(currentCheckbox.text() === '☐' ? '☑' : '☐'); });
	} catch (err) {
		(function(){})('055-facets-drawer error:', err);
	}

	(function(){})('055-facets-drawer: loaded');
})();

 },
 destroy:function(){return false;},
 onConfigChange:function(){return {reloadRequired:true};}
};
KT.registerModule(runtime);
if(CFG.mode==="shadow"){
 KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});
 return;
}
runtime.init();
})();