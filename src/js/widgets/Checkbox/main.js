define(['knockout'], function (ko) {

    /**
     * Виджет чекбокса.
     * @param {Object} params параметры чекбокса
     * @param {Observable enum} mode режим bool | half, bool - двоичный, выбран - не выбран, checked - boolean observable, half - троичный, выбран/полувыбран/не выбран
     * @param {Observable Tinyint} params.checked состояние чекбокса, 0 - не выбран, 1 - выбран, 2 - полувыбран в режиме half, true/false в режиме bool
     * @constructor
     */
    var Checkbox = function (params) {
        this._mode = this.asObservable(params.mode,"bool");
        this._checked = this.asObservable(params.checked,this._mode()=="half"?0:false);
        this._css = this.asObservable(params.css,"");
        this._color = this.asObservable(params.color,"#002f40");
    }

    Checkbox.prototype.asObservable = function(v,defaultV) {
        if (ko.isObservable(v) || ko.isComputed(v)) return v;
        return ko.observable(typeof v == "function" ? v() : (typeof v == "undefined" ? defaultV : v));
    }

    Checkbox.prototype.click = function () {
        if (this.isChecked()) this.unCheck();
        else this.check();
    }

    Checkbox.prototype.isChecked = function() {
        return this._mode()=="half" ? this._checked() == 1 : this._checked();
    }

    Checkbox.prototype.isHalfChecked = function() {
        return this._mode() == "half" ? this._checked() == 2 : false;
    }

    Checkbox.prototype.isUnChecked = function() {
        return this._mode() == "half" ? this._checked() == 0 : !this._checked();
    }

    Checkbox.prototype.check = function() {
        this._checked(this._mode()=="half"?1:true);
        this.emit("changed",this._checked());
    }

    Checkbox.prototype.unCheck = function() {
        this._checked(this._mode()=="half"?0:false);
        this.emit("changed",this._checked());
    }

    Checkbox.prototype.halfCheck = function() {
        this._checked(this._mode()=="half"?2:false);
        this.emit("changed",this._checked());
    }

    Checkbox.prototype.templates = ["main"];
    return Checkbox;
});