define(function () {

	// Glyph Lookup //
    var symRef = {
        24 : 'glyphicon glyphicon-asterisk',
        25 : 'glyphicon glyphicon glyphicon-plus',
        26 : 'glyphicon glyphicon-star',
        27 : 'glyphicon glyphicon-star-empty',
        28 : 'glyphicon glyphicon-th-large',
        29 : 'glyphicon glyphicon glyphicon-minus',
        30 : 'glyphicon glyphicon-stop',
        31 : 'glyphicon glyphicon glyphicon-plus-sign',
        32 : 'glyphicon glyphicon-download',
        33 : 'glyphicon glyphicon-upload',
        34 : 'glyphicon glyphicon-play-circle',
        35 : 'glyphicon glyphicon-repeat',
        36 : 'glyphicon glyphicon-refresh',
        37 : 'glyphicon glyphicon-tint',
        38 : 'glyphicon glyphicon-chevron-left',
        39 : 'glyphicon glyphicon-chevron-right',
        40 : 'glyphicon glyphicon-certificate',
        41 : 'glyphicon glyphicon-unchecked',
        42 : 'glyphicon glyphicon-record',
        43 : 'glyphicon glyphicon-menu-left',
        44 : 'glyphicon glyphicon-menu-right',
        45 : 'glyphicon glyphicon-menu-down',
        46 : 'glyphicon glyphicon-menu-up'
    }

    return {
        glyphLookup: function (length) {
        	return symRef[length];
    	}
    };

});
