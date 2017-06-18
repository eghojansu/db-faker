<?php

namespace controller;

use Base;
use myfaker\MyFaker;

class MainController extends BaseController {
    public function indexAction(Base $base) {
        $base->mset([
            'databases'=>$this->db->showDatabases(),
        ]);
        $this->render('main/index.html');
    }

    public function tablesAction(Base $base, array $args) {
        $this->json($this->db->showTables($args['db']));
    }

    public function configAction(Base $base, array $args) {
        $this->json($this->db->showColumns($args['db'], $base->get('GET.tables')));
    }

    public function rulesAction(Base $base) {
        $this->json(MyFaker::getRules());
    }

    public function executeAction(Base $base) {
        $db = $base['POST.db'];
        $tables = $base['POST.tables'];
        $result = 'Cannot process your request';

        if ($db && $tables) {
            $databases = $this->db->showDatabases();

            if (in_array($db, $databases)) {
                $result = 'No tables processed';
                $tablesValid = $this->db->showTables($db);

                $resultSuccess = [];
                $error = false;
                $myFaker = new MyFaker(\Faker\Factory::create('id_ID'));
                $pdo = $this->db->getPdo();
                $pdo->beginTransaction();

                foreach ($tables as $table => $options) {
                    $options += ['columns'=>[],'rows'=>0,'clear'=>false];
                    if (in_array($table, $tablesValid) && $options['columns']) {
                        if ($options['clear']) {
                            $delete = $this->buildDelete($db, $table);
                            $pdo->exec($delete['sql']);
                            $pdo->exec($delete['auto_increment']);
                        }

                        $rules = $this->buildRule($myFaker, $db, $table, $options['columns']);
                        $query = $pdo->prepare($rules['sql']);
                        $row = $options['rows'] * 1;
                        for ($i=0; $i < $row; $i++) {
                            $args = call_user_func($rules['args']);
                            $query->execute($args);
                        }

                        if ($query->errorCode() === '00000') {
                            $resultSuccess[] = "Table $table has been inserted with $row rows" .
                                ($options['clear']?' (Old rows has been deleted)':'');
                        } else {
                            $result = $query->errorInfo();
                            $result = $result[2] . "<br>Query: " .$rules['sql'];
                            $resultSuccess = [];
                            $error = true;
                        }
                    }
                }

                $error ? $pdo->rollback() : $pdo->commit();

                $result = $resultSuccess ? implode("\n", $resultSuccess) : $result;
            }
        }

        echo $result;
    }

    private function buildRule(MyFaker $myFaker, $db, $table, array $columns) {
        $columnsName = [];
        foreach ($columns as $key => $column) {
            $columnsName[] = $column['name'];
            $columns[$key]['args'] = $myFaker->normalizeArgs($column['rule'], $column['args']);
        }

        $sql = "INSERT INTO `$db`.`$table` (`".implode('`,`', $columnsName)."`) VALUES (:".
            implode(', :', $columnsName).')';
        $args = function() use ($columns, $myFaker) {
            $args = [];
            foreach ($columns as $column) {
                $args[':'.$column['name']] = call_user_func_array([$myFaker->faker, $column['rule']], $column['args']);
            }

            return $args;
        };

        return [
            'sql'=>$sql,
            'args'=>$args,
        ];
    }

    private function buildDelete($db, $table) {
        return [
            'sql'=>"DELETE FROM `$db`.`$table`",
            'auto_increment'=>"ALTER TABLE `$db`.`$table` AUTO_INCREMENT = 1",
        ];
    }
}
