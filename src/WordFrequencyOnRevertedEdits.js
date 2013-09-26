/**
 * Generate a list of words by frequency based on reverted edits
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/WordFrequencyOnRevertedEdits.js]] ([[File:User:Helder.wiki/Tools/WordFrequencyOnRevertedEdits.js]])
 */
/*jshint browser: true, camelcase: true, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, maxlen: 120, evil: true, onevar: true, laxbreak: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

function processDiffs( diffs ) {
	var $target = $('#mw-content-text').empty(),
		freq = {},
		i, w, diffText, words, sorted;
	for( i = 0; i < diffs.length; i++ ){
		diffText = $( diffs[i] )
			.find( '.diff-deletedline' )
			.text();
		words = diffText.split( /[^a-záàâãçéêíñóôõúü\'ºª\-]/i );
		for( w = 0; w < words.length; w++ ){
			freq[ words[w] ] = ( freq[ words[w] ] || 0 ) + 1;
		}
	}
	sorted = $.map( freq, function( count, word ) {
		if( count > 1 ) {
			return { word: word, frequency: count };
		} else {
			return null;
		}
	} );
	sorted = sorted.sort(function(a,b){ return b.frequency-a.frequency; });

	for( i = 0; i < sorted.length; i++ ){
		$target
			.append( sorted[i].word + ': ' + sorted[i].frequency )
			.append( '<br />' );
	}
}

function getDiffs( revids ) {
	var str, i;
	str = revids[0].toString();
	for( i = 1; i < revids.length && i < 500 && str.length < 255; i++ ){
		str += '|' + revids[i];
	}
	( new mw.Api() ).get( {
		action: 'query',
		prop: 'revisions',
		rvdiffto: 'prev',
		revids: str,
		indexpageids: true
	} )
	.done( function ( data ) {
		// console.log( data );
		var i, pIds = data.query.pageids,
			diffs = [];
		for( i = 0; i < pIds.length; i++ ){
			diffs.push( data.query.pages[ pIds[i] ].revisions[0].diff['*'] );
		}
		processDiffs( diffs );
	} );
}

function getList() {
	( new mw.Api() ).get( {
		action: 'query',
		list: 'usercontribs',
		uclimit: 'max',
		ucuser: 'Salebot',
		ucprop: 'ids|comment'
	} )
	.done( function ( data ) {
		var i, contribs = data.query.usercontribs,
			reversionIds = [];
		for( i = 0; i < contribs.length; i++ ){
			if( contribs[i].comment.match( /bot: revertidas edições de/ ) ){
				reversionIds.push( contribs[i].revid );
			}
		}
		getDiffs( reversionIds );
	} );
}
 
if( mw.config.get( 'wgAction' ) === 'view'
	&& mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage'
	&& mw.config.get( 'wgTitle' ).match( /\/WordFrequencyOnRevertedEdits$/ )
) {
	mw.loader.using( [ 'mediawiki.api' ], getList );
}

}( mediaWiki, jQuery ) );