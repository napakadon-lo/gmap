odoo.define("ac_ktis_qc.qc_import", function(require){
"use strict";
    var core = require('web.core');
    var Widget = require('web.Widget');
    var ControlPanelMixin = require('web.ControlPanelMixin');
    var session = require('web.session');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;
    var _t = core._t;

    var qc_import = Widget.extend(ControlPanelMixin, {
        template: 'ImportQCView',
        init: function (parent, action) {
            this._super.apply(this, arguments);
            this.action_manager = parent;
            this.parent_context = action.params.context || {};
            // import object id
            this.id = null;
            this.session = session;
            action.display_name = _t('Import QC File'); // Displayed in the breadcrumbs
            this.do_not_change_match = false;
        },

        start: function () {
            var self = this;
            return $.when(this._super.apply(this, arguments)).then(function() {
            self.render();
            });
        },

        renderButtons: function() {
            var self = this;
            this.$buttons = $(QWeb.render("ImportQCView.buttons", this));
            this.$buttons.filter('.o_import_validate').on('click', this);
            this.$buttons.filter('.o_import_import').on('click', this);
            this.$buttons.filter('.o_import_cancel').on('click', function(e) {
                e.preventDefault();
                self.exit();
                });
        },

        update_cp: function() {
            if (!this.$buttons) {
                this.renderButtons();
            }
            var status = {
                breadcrumbs: this.action_manager.get_breadcrumbs(),
                cp_content: {$buttons: this.$buttons},
            };
            return this.update_control_panel(status, {clear: true});
        },


        render: function() {
            this.update_cp();
        },

        get_mo_list: function(){
            var self = this;
            var mo_list = [];
            var args = [
                    [['state', '=', 'progress']],
                    ['name'],
                ];
            var loaded = rpc.query({
                    model: 'mrp.production',
                    method: 'search_read',
                    args: args,
                })
                .then(function(mo){
                    console.log("MO", mo);
                    /*var content = self.$('#mo-select').html();*/
                    /*for(let key in mo){*/
                    /*console.log("obj",mo[key]);*/
                    /*var obj = mo[key];*/
                    /*var new_option = '<option value="' + obj['name'] + '">' + obj['name'] + '</option>\n';*/
                        /*self.$('#mo-select').html(content + new_option);*/
                        /*}*/
                    for(var i = 0, len = mo.length; i < len; i++){
                    mo_list.push(mo[i].name);
                    }
                    console.log("2.hello", mo_list);
                    if(mo_list.length > 0){
                        for(var i = 0, len = mo_list.length; i < len; i++){
                            var content = self.$('#mo-select').html();
                            var new_option = '<option value="' + mo_list[i] + '">' + mo_list[i] + '</option>\n';
                            self.$('#mo-select').html(content + new_option);
                        }
                    }
                });
        },

        get_html: function() {
        var self = this; 
        return this._rpc({
                model: 'mrp.production',
                method: 'get_html',
                args: [this.domain],
                kwargs: {
                    context: self.action && self.action.context || session.user_context,
                },
            })
            .then(function (result) {
                self.html = result.html;
                self.report_context = result.report_context;
                self.renderButtons();
            });

    },

    });
    core.action_registry.add('qc_import', qc_import);
    return qc_import;
});
