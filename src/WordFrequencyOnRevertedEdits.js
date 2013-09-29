/**
 * Generate a list of words by frequency based on reverted edits
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/WordFrequencyOnRevertedEdits.js]] ([[File:User:Helder.wiki/Tools/WordFrequencyOnRevertedEdits.js]])
 */
/*jshint browser: true, camelcase: true, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, maxlen: 120, evil: true, onevar: true, laxbreak: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

var sampleSize = 5000,
	// Testar também com o Salebot
	user = 'Stuckkey';

function processDiffs( diffs ) {
	var $list = $( '<ul>' ),
		freq = {},
		i, w, diffText, words, sorted;
	for( i = 0; i < diffs.length; i++ ){
		diffText = $( diffs[i] )
			.find( '.diff-deletedline .diffchange' )
			.text();
		words = diffText.split( /[^a-záàâãçéêíñóôõúü\'ºª\-]/i );
		for( w = 0; w < words.length; w++ ){
			if( words[w].length ) {
				freq[ words[w] ] = ( freq[ words[w] ] || 0 ) + 1;
			}
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
		$list.append(
			$( '<li>' ).text(
				sorted[i].word + ': ' + sorted[i].frequency
			)
		);
	}
	$( '#mw-content-text' )
		.empty()
		.append(
			$( '<p>' )
				.text( 'Palavras mais frequentes nas edições revertidas por ' + user + ':' )
		)
		.append( $list );
}

function getDiffs( revIds ) {
	var i, diffs = [],
		start = 0,
		params = {
			action: 'query',
			prop: 'revisions',
			rvdiffto: 'prev',
			indexpageids: true
		},
		getBatchOfIds = function(){
			var str = revIds[start].toString();
			for( i = start + 1; i < revIds.length && i - start < 500 && str.length < 255; i++ ){
				str += '|' + revIds[i];
			}
			start = i;
			return str;
		},
		processBatch = function ( data ) {
			var i, pIds = data.query.pageids;
			for( i = 0; i < pIds.length; i++ ){
				diffs.push( data.query.pages[ pIds[i] ].revisions[0].diff['*'] );
			}
			if( start < revIds.length ){
				getBatch();
			} else {
				processDiffs( diffs );
			}
		},
		getBatch = function () {
			params.revids = getBatchOfIds();
			( new mw.Api() ).get( params )
				.done( processBatch );
			
		};
	getBatch();
}

function getList() {
	( new mw.Api() ).get( {
		action: 'query',
		list: 'usercontribs',
		uclimit: sampleSize,
		ucuser: user,
		ucprop: 'ids|comment'
	} )
	.done( function ( data ) {
		var i, contribs = data.query.usercontribs,
			reversionIds = [];
		for( i = 0; i < contribs.length; i++ ){
			if( contribs[i].comment.match( /(?:bot: revertidas|\[\[WP:REV\|Revertidas\]\]) edições/ ) ){
				reversionIds.push( contribs[i].revid );
			}
		}
		// if( reversionIds.length < sampleSize ){
			// Get more edits
		// }
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