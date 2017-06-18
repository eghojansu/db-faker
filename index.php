<?php

require 'vendor/autoload.php';

$database = [
    'host'=>'localhost',
    'username'=>'root',
    'password'=>'root',
    'ignores'=>[
        'information_schema',
        'performance_schema',
        'mysql',
    ],
];

$base = Base::instance();
$base->set('DB', $database);
$base->config('app/app.ini');
$base->config('app/config.ini');
$base->config('app/routes.ini');
$base->run();
