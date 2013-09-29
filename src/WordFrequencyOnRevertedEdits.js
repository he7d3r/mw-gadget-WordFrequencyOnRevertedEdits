/**
 * Generate a list of words by frequency based on reverted edits
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/WordFrequencyOnRevertedEdits.js]] ([[File:User:Helder.wiki/Tools/WordFrequencyOnRevertedEdits.js]])
 */
/*jshint browser: true, camelcase: true, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, maxlen: 120, evil: true, onevar: true, laxbreak: true, devel:true, forin: false*/
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

/* Translatable strings */
mw.messages.set( {
	'wf-intro': 'Os dados abaixo foram obtidos por um script',
	'wf-table-caption': 'Palavras mais frequentes nas edições revertidas por $1',
	'wf-table-word': 'Palavra',
	'wf-table-reverted': 'Reversões',
	'wf-table-used': 'Usos',
	'wf-link': 'Palavras mais revertidas',
	'wf-link-description': 'Gerar estatísticas sobre as palavras mais ' +
		'usadas nas edições revertidas',
	'wf-user-prompt': 'Deseja analisar as reversões de que usuário? (exemplos: $1, etc)',
	'wf-regex': '(?:bot: revertidas|\\[\\[WP:REV\\|Revertidas\\]\\]) edições|Desfeita a edição'
} );
 
var sampleSize = 5000,
	users = [ 'Stuckkey', 'Salebot', mw.config.get( 'wgUserName' ) ],
	user;

function showWikiTable( table, caption ) {
	var wikicode = mw.msg( 'wf-intro' ) +
			'\n{| class="wikitable sortable"\n|+ ' + caption,
		columns = [],
		colKey, i, j, cell, row;
	for( colKey in table[0] ){
		columns.push( colKey );
	}
	for( i = 0; i < table.length; i++ ){
		cell = i === 0 ? '!' : '|';
		row = '\n|-';
		for( j = 0; j < columns.length; j++ ){
			row += '\n' + cell + ' ' + table[i][ columns[j] ];
		}
		wikicode += row;
	}
	wikicode += '\n|}';
	$( '#mw-content-text' )
		.prepend(
			'<textarea cols="80" rows="10" style="width: 100%; font-family: monospace; line-height: 1.5em;">' +
				mw.html.escape( wikicode ) +
			'</textarea>'
		);
}

function showTable( table, caption ) {
	var $tbody = $( '<tbody>' ),
		$table = $( '<table class="wikitable sortable">' ),
		columns = [],
		colKey, i, j, $row, cell;
	for( colKey in table[0] ){
		columns.push( colKey );
	}
	for( i = 0; i < table.length; i++ ){
		cell = i === 0 ? '<th>' : '<td>';
		$row = $( '<tr>' );
		for( j = 0; j < columns.length; j++ ){
			$row.append(
				$( cell ).text( table[i][ columns[j] ] )
			);
		}
		$tbody.append( $row );
	}
	$( '#mw-content-text' )
		.prepend(
			$table.append(
				$( '<caption>' ).text( caption ),
				$tbody
			)
		);
	mw.loader.using( 'jquery.tablesorter', function () {
		$table.tablesorter();
	} );
}

function processDiffs( diffs ) {
	var table = {},
		used, i, w, diffText, words, sorted;
	for( i = 0; i < diffs.length; i++ ){
		diffText = $( diffs[i] )
			.find( '.diff-deletedline .diffchange' )
			.text();
		words = diffText.split( /[^a-záàâãçéêíñóôõúü\'ºª\-]/i );
		used = {};
		for( w = 0; w < words.length; w++ ){
			if( words[w].length ) {
				used[ words[w] ] = ( used[ words[w] ] || 0 ) + 1;
			}
		}
		for( w in used ){
			if( table[ w ] ){
				table[ w ].used += used[ w ];
				table[ w ].reverted++;
			} else {
				table[ w ] = {
					reverted: 1,
					used: used[ w ]
				};
			}
		}
	}
	sorted = $.map( table, function( info, word ) {
		if( info.used > 1 ) {
			return {
				word: word,
				reverted: info.reverted,
				used: info.used
			};
		}
		return null;
	} );
	sorted = sorted.sort( function( a, b ){
		return b.reverted - a.reverted;
	} );
	// Insert the headers at the beginning of the list
	sorted.splice(0, 0, {
		word: mw.msg( 'wf-table-word' ),
		reverted: mw.msg( 'wf-table-reverted' ),
		used:  mw.msg( 'wf-table-used' )
	});
	showTable( sorted, mw.msg( 'wf-table-caption', user ) );
	showWikiTable( sorted, mw.msg( 'wf-table-caption', user ) );
	$.removeSpinner( 'wf-spinner' );
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
				.done( processBatch )
				.fail( function () {
					$.removeSpinner( 'wf-spinner' );
				} );
		};
	getBatch();
}

function getList() {
	$( '#firstHeading' ).find('span').injectSpinner( 'wf-spinner' );
	( new mw.Api() ).get( {
		action: 'query',
		list: 'usercontribs',
		uclimit: sampleSize,
		ucuser: user,
		ucprop: 'ids|comment'
	} )
	.done( function ( data ) {
		var i, contribs = data.query.usercontribs,
			reversionIds = [],
			revRegex = new RegExp( mw.message( 'wf-regex' ).plain() );
		for( i = 0; i < contribs.length; i++ ){
			if( contribs[i].comment.match( revRegex ) ){
				reversionIds.push( contribs[i].revid );
			}
		}
		// if( reversionIds.length < sampleSize ){
			// Get more edits
		// }
		if( !reversionIds.length ){
			$.removeSpinner( 'wf-spinner' );
			return;
		}
		getDiffs( reversionIds );
	} )
	.fail( function () {
		$.removeSpinner( 'wf-spinner' );
	} );
}

function addWordFrequencyLink (){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		mw.msg( 'wf-link' ),
		'ca-reverted-words',
		mw.msg( 'wf-link-description' )
	) ).click( function(e){
		e.preventDefault();
		user = prompt( mw.msg( 'wf-user-prompt', users.join( ', ' ) ), users[0] );
		if( !user ){
			return;
		}
		mw.loader.using( [
			'mediawiki.api',
			'jquery.spinner'
		], getList );
	} );
}

if( mw.config.get( 'wgAction' ) === 'view' ){
	$( addWordFrequencyLink );
}

}( mediaWiki, jQuery ) );