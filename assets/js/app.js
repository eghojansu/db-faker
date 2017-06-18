(function($) {

    $(document).on('ready', function() {
        var mainContentHeight = $('.main-content').height();

        resizeContentHeight(mainContentHeight);
        tiktok();

        $(window).on('resize', function() {
            resizeContentHeight(mainContentHeight);
        });

        $('#dbname').on('change', function() {
            var $elem = $(this);
            var $target = $('.table-selector');
            var $child = $('.table-configuration');
            var $table = $target.find('.table');
            var $tableChild = $child.find('.table');
            var $body = $table.find('tbody');
            var val = $elem.val();
            var maxLength = 20;

            $target.loading();
            $table.slideUp();
            $tableChild.slideUp();
            loadRules();

            if (val) {
                $.get($.app.url.tables(val), null, function(response) {
                    $body.find('tr').remove();
                    if (response.length > 0) {
                        for (var i = 0; i < response.length; i++) {
                            $body.append('<tr data-table="'+response[i]+'">' +
                                '<td><input class="check_all" type="checkbox" value="'+response[i]+'"></td>'+
                                '<td>'+(i+1)+'</td>'+
                                '<td title="'+response[i]+'">'+response[i].substr(0, maxLength)+(response[i].length >= maxLength ? '...':'')+'</td>'+
                                '</tr>');
                        }
                    } else {
                        $body.append('<tr><td colspan="3">No table available</td></tr>');
                    }
                    $target.loading(false);
                    $table.slideDown();
                }, 'json');
            } else {
                $target.loading(false);
            }
        });
        $('.table-selector #check_all').on('change', function() {
            var $elem = $(this);
            var state = $elem.is(':checked');
            var $target = $elem.parents('table').find('tbody');

            $target.find('.check_all').each(function() {
                $(this).prop('checked', state)
            });
            $target.updateTableCheckState();
            loadTableConfiguration();
        });
        $('.table-selector table tbody').on('change', '.check_all', function() {
            var $target = $(this).parents('tbody');
            $target.updateTableCheckState();
            loadTableConfiguration();
        });
        // $('.table-configuration #check_all').on('change', function() {
        //     var $elem = $(this);
        //     var state = $elem.is(':checked');
        //     var $target = $elem.parents('table').find('tbody');

        //     $target.find('.check_all').each(function() {
        //         $(this).prop('checked', state)
        //     });
        //     $target.updateColumnCheckState();
        // });
        // $('.table-configuration table tbody').on('change', '.check_all', function() {
        //     var $target = $(this).parents('tbody');
        //     $target.updateColumnCheckState();
        // });
        $('.table-configuration table tbody').on('change', 'select', function() {
            var $parent = $(this).parents('tr');
            var $elem = $(this);
            var $option = $elem.find('option:selected');
            var args = $option.data('args');
            var $checkbox = $parent.find('.check_all');

            if (typeof args == 'undefined') {
                $checkbox.prop('checked', false);
                $parent.find('.text-config').text('');

                return;
            }

            $checkbox.prop('checked', true);
            $parent.find('.text-config').text('{'+args+'}');
            $parent.parents('tbody').updateColumnCheckState();
        });
        $('.table-configuration table tbody').on('click', '[href="#edit-config"]', function(event) {
            event.preventDefault();
            var $parent = $(this).parents('tr');
            var $dialog = $('#edit-args-dialog');
            var $body = $dialog.find('table tbody');
            var args = $parent.find('select option:selected').data('args');
            var $clone = $body.find('tr.base').clone();
            $clone.addClass('last-base').removeClass('base hide');

            $body.find('tr:not(.base)').remove();

            if (args) {
                args = JSON.parse('{'+args+'}');
                for (var k in args) {
                    var $clone2 = $clone.clone();
                    $clone2.removeClass('last-base');
                    if (isNaN(k)) {
                        $clone2.find('input[name=name]').val(k);
                    }
                    $clone2.find('input[name=value]').val($.isArray(args[k])?args[k].join(','):args[k]);
                    $clone2.appendTo($body);
                }

                // $clone.appendTo($body);
                $dialog.data('opener', '.table-configuration table tbody tr:eq('+$parent.index()+')');
                $dialog.modal('show');
            } else {
                alert('Select filler first!');
            }
        });
        $('#btn-reset').on('click', function() {
            $('#dbname').val('').trigger('change');
        });
        $('#build-statement').on('click', function() {
            var $dialog = $('#progress-dialog');
            var $body = $dialog.find('.modal-body');

            $body.text('Executing...');
            $dialog.modal('show');
            $dialog.find('.btn').hide();

            var args = {};
            args.db = $('#dbname').val();
            args.tables = {};
            $('.table-selector table tbody tr[data-table]').each(function() {
                if (!$(this).find('.check_all').is(':checked')) {
                    return;
                }
                var table = $(this).data('table');
                args.tables[table] = {
                    "name": table,
                    "columns": []
                };
            });
            $('.table-configuration table tbody tr[data-config]').each(function() {
                if (!$(this).find('.check_all').is(':checked')) {
                    return;
                }
                var config = JSON.parse('{'+$(this).data('config')+'}');
                var column = {};
                var table = $(this).data('table');
                column.name = config.name;
                column.args = JSON.parse($(this).find('.text-config').text());
                column.rule = $(this).find('select').val();
                args.tables[table].columns.push(column);
            });
            $('.table-configuration table tbody tr.table-name').each(function() {
                var table = $(this).data('table');
                args.tables[table].rows = $(this).find('[name=count]').val();
                args.tables[table].clear = $(this).find('[name=clear]').is(':checked');
            });

            $.post($.app.url.execute(), args, function(response) {
                $body.html(response);
                 $dialog.find('.btn').show();
            }, 'text');
        });
        // $('#edit-args-dialog').on('focus', 'input:text', function() {
        //     var $parent = $(this).parents('tr');
        //     if ($parent.hasClass('last-base')) {
        //         var $clone = $parent.clone();
        //         $parent.removeClass('last-base');
        //         $parent.parents('tbody').append($clone);
        //     }
        // });
        $('#edit-args-dialog').on('keydown', 'input:text', function(event) {
            if (event.which == 13) {
                event.preventDefault();
                $('#edit-args-dialog .btn-primary').click();
            }
        });
        $('#edit-args-dialog .btn-primary').on('click', function() {
            var $dialog = $('#edit-args-dialog');
            var $body = $dialog.find('table tbody');
            var $opener = $($dialog.data('opener'));
            var newArgs = {};
            $body.find('tr:not(.base)').each(function() {
                var name = $(this).find('[name=name]').val();
                var value = $.trim($(this).find('[name=value]').val());
                if (name) {
                    newArgs[name] = value.indexOf(',')>-1?value.split(','):
                        (value=='true'?true:(value=='false'?false : (value=='null'||value==''?null:value)));
                }
            });
            $opener.find('.text-config').text(JSON.stringify(newArgs));
            $dialog.modal('hide');
        });

        $.fn.loading = function(show) {
            if (typeof show == 'undefined') {
                show = true;
            }

            return this.each(function(i) {
                var className = 'loading';
                var $elem = $(this).find('.'+className);
                $elem.remove();

                if (show) {
                    $elem = $('<span/>').addClass(className).text('loading...');
                    $(this).prepend($elem);
                }
            });
        };
        // apply to tbody
        $.fn.updateTableCheckState = function() {
            return this.each(function(i) {
                var className = 'check-state';
                var $elem = $(this).find('.'+className);
                var total = 0;
                var checked = 0;
                var colspan = $(this).parents('table').find('thead tr').children().length;
                $elem.remove();
                $(this).find('.check_all').each(function() {
                    total++;
                    checked += this.checked ? 1 : 0;
                });

                var row = '<tr class="'+className+'"><td colspan="'+colspan+'">Checked: ' + checked + '/' + total + '</td></tr>';
                $(this).prepend(row);
            });
        };
        // apply to tbody
        $.fn.updateColumnCheckState = function() {
            return this.each(function(i) {
                var $that = $(this);
                var className = 'check-state';
                var $elem = $(this).find('.'+className);
                $elem.each(function() {
                    var $tr = $(this).parents('tr');
                    var table = $tr.data('table');
                    var total = 0;
                    var checked = 0;
                    $that.find('tr[data-table="'+table+'"] .check_all').each(function() {
                        total++;
                        checked += this.checked ? 1 : 0;
                    });

                    $(this).text('Checked: ' + checked + '/' + total);
                });
            });
        };
    });

    var handle;
    function loadTableConfiguration() {
        clearTimeout(handle);
        var $elem = $('.table-configuration');
        var $table = $elem.find('.table');
        var $body = $table.find('tbody');
        var $control = $('#build-statement');
        var db = $('#dbname').val();
        var args = {"tables":[]};
        var maxLength = 30;
        $table.slideUp();
        $elem.loading();
        $control.prop('disabled', true);

        handle = setTimeout(function() {
            $('.table-selector table tbody :checkbox').filter(function(){
                return this.checked;
            }).each(function() {
                args.tables.push(this.value);
            });

            if (args.tables.length == 0) {
                $elem.loading(false);

                return;
            }

            $.get($.app.url.config(db), args, function(response) {
                $body.find('tr').remove();
                var tableCount = 0;
                var rowCount = 1;
                for (var table in response) {
                    var columns = response[table];
                    $body.append('<tr class="table-name" data-table="'+table+'">'+
                        '<td colspan="3">Table: <strong>'+table+'</strong> <span class="check-state"></span></td>'+
                        '<td colspan="2" class="text-right">'+
                            '<div style="display: inline-block">Generate rows: <input placeholder="Generate rows" class="form-control input-md" type="text" name="count" value="10" style="display: inline-block;max-width: 80px"></div>'+
                            '<div style="display: inline-block; margin-left: 10px" class="checkbox"><label><input type="checkbox" name="clear" value="'+table+'"> Add clear table statement</label></div>'+
                        '</td>'+
                        '</tr>');
                    for (var i = 0; i < columns.length; i++) {
                        var column = columns[i];
                        var data = JSON.stringify(column);
                        data = data.substr(1, data.length -2);
                        $tr = $('<tr data-config=\''+data+'\' data-table="'+table+'">' +
                            '<td><input class="check_all" disabled type="checkbox" value="'+column.name+'"></td>'+
                            '<td>'+(rowCount++)+'</td>'+
                            '<td title="'+column.name+'">'+column.name.substr(0, maxLength)+(column.name.length >= maxLength ? '...':'')+'</td>'+
                            '<td class="rules-selector">'+column.type+'</td>'+
                            '<td><a href="#edit-config">edit</a> <span class="text-config"></span></td>'+
                            '</tr>');
                        $body.append($tr);
                        var ruleSelector = rulesSelect.clone();
                        $tr.find('.rules-selector').html('').append(ruleSelector);
                        ruleSelector.selectpicker({
                            liveSearch: true
                        });
                    }
                    tableCount++;
                }
                if (tableCount == 0) {
                    $body.append('<tr><td colspan="5">No columns available</td></tr>');
                }
                $elem.loading(false);
                $table.slideDown();
                $control.prop('disabled', false);
            }, 'json');
        }, 1000);
    }

    var rulesSelect;
    function loadRules() {
        if (!rulesSelect) {
            rulesSelect = $('<select/>').addClass('form-control rules-select');
            rulesSelect.append('<option></option>');
            $.get($.app.url.rules(), null, function(response) {
                for (var rule in response) {
                    var args = JSON.stringify(response[rule].args);
                    args = args.substr(1, args.length -2);
                    rulesSelect.append('<option value="'+rule+'" data-args=\''+
                        args +'\'>'+response[rule].desc+'</option>');
                }
            }, 'json');
        }
    }

    function resizeContentHeight(mainContentHeight) {
        var $elem = $('.main-content .container');
        $elem.css({
            "min-height": mainContentHeight
        });
    }

    function tiktok() {
        var handler;
        var oneSecond = 1000;
        var oneMinute = 60000;
        var timeout = oneSecond;
        var $elem = $('[data-tiktok]');
        var timestamp = $elem.data('tiktok') * 1000;
        var updateTime = function() {
            timestamp += timeout;

            var now = new Date(timestamp);
            var dis = twoDigit(now.getDate()) + '/' + twoDigit(now.getMonth() + 1) + '/' + now.getFullYear() + ' ' +
                twoDigit(now.getHours()) + ':' + twoDigit(now.getMinutes());
            $elem.text(dis);

            return now.getSeconds();
        };

        if ($elem.length <= 0) {
            return;
        }

        handler = setInterval(function() {
            if (0 == updateTime() && timeout == oneSecond) {
                clearInterval(handler);
                timeout = oneMinute;
                handler = setInterval(function() {
                    updateTime();
                }, timeout);
            }
        }, timeout);
    }

    function twoDigit(num) {
        return num < 10 ? '0' + num : num;
    }
})(jQuery);
