'use strict';

// MODULES //

var exec = require( 'child_process' ).exec;
var logger = require( 'debug' );
var replace = require( '@stdlib/string/replace' );
var cwd = require( '@stdlib/utils/cwd' );


// VARIABLES //

var debug = logger( 'remark-run-javascript-examples:transformer' );
var EXAMPLES_BEGIN = '<section class="examples">';
var EXAMPLES_END = '<!-- /.examples -->';
var RE_TRAILING_EOL = /\r?\n$/;
var NODE = process.execPath;


// MAIN //

/**
* Transforms a Markdown abstract syntax tree (AST).
*
* @private
* @param {Node} tree - root AST node
* @param {File} file - virtual file
* @param {Callback} clbk - callback to invoke upon completion
* @returns {void}
*/
function transformer( tree, file, clbk ) {
	var total;
	var FLG;
	var idx;

	debug( 'Processing file: %s', file.path || '' );

	idx = -1;
	total = tree.children.length;
	debug( '%d AST nodes.', total );

	if ( total === 0 ) {
		return done();
	}
	return next();

	/**
	* Processes the next AST node.
	*
	* @private
	* @returns {void}
	*/
	function next() {
		var script;
		var node;
		var opts;
		var cmd;

		idx += 1;
		debug( 'Processing AST node %d of %d...', idx+1, total );

		node = tree.children[ idx ];
		debug( 'Node type: %s', node.type );

		if ( node.type === 'html' ) {
			if ( node.value === EXAMPLES_BEGIN ) {
				debug( 'Found an examples section.' );
				FLG = true;
			} else if ( node.value === EXAMPLES_END ) {
				debug( 'Finished processing examples section.' );
				FLG = false;
			}
			return done();
		}
		if ( FLG && node.type === 'code' && node.lang === 'javascript' ) {
			debug( 'Found a JavaScript code block.' );
			script = node.value;

			// Replace single quotes with double quotes:
			script = replace( script, '\'', '"' );

			// Create the script command:
			cmd = [ NODE, '-e', '\''+script+'\'' ].join( ' ' );

			// Set the working directory of the script to the file directory:
			opts = {
				'cwd': file.dirname || cwd()
			};

			debug( 'Executing code block...' );
			exec( cmd, opts, onExec );
		} else {
			return done();
		}
	} // end FUNCTION next()

	/**
	* Callback invoked upon executing a code block.
	*
	* @private
	* @param {(Error|null)} error - error object
	* @param {Buffer} stdout - standard output
	* @param {Buffer} stderr - standard error
	* @returns {void}
	*/
	function onExec( error, stdout, stderr ) {
		if ( error ) {
			debug( 'Encountered an error when executing code block: %s', error.message );

			// TODO: the generated error is a bit messy. Cleaning-up may require manual modification of the stacktrace(s), etc.
			error = new Error( 'unexpected error. Encountered an error when executing code block. File: ' + (file.path || '') + '. Message: ' + error.message );
			return done( error );
		}
		stdout = stdout.toString();
		if ( stdout ) {
			// Trim off a trailing newline (e.g., prevent `console.log( console.log() )`:
			console.log( replace( stdout, RE_TRAILING_EOL, '' ) );
		}
		stderr = stderr.toString();
		if ( stderr ) {
			// Trim off a trailing newline (e.g., prevent `console.error( console.error() )`:
			console.error( replace( stderr, RE_TRAILING_EOL, '' ) );
		}
		debug( 'Finished executing code block.' );
		done();
	} // end FUNCTION onExec()

	/**
	* Callback invoked upon processing an AST node.
	*
	* @private
	* @param {Error} [error] - error object
	* @returns {void}
	*/
	function done( error ) {
		if ( error ) {
			return clbk( error );
		}
		debug( 'Processed %d of %d AST nodes.', idx+1, total );
		if ( idx === total-1 ) {
			debug( 'Finished processing file.' );
			return clbk();
		}
		next();
	} // end FUNCTION done()
} // end FUNCTION transformer()


// EXPORTS //

module.exports = transformer;