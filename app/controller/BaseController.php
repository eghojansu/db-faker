<?php

namespace controller;

use Base;
use Template;
use model\Db;

abstract class BaseController {
    protected $db;

    public function __construct() {
        $this->db = new Db(Base::instance()->get('DB'));
    }

    protected function render($view) {
        $template = Template::instance();
        Base::instance()->set('CONTENT', $template->render($view));

        echo $template->render('template.html');
    }

    protected function json($data) {
        header('Content-Type: application/json');
        echo is_string($data) ? $data : json_encode($data);
    }
}
